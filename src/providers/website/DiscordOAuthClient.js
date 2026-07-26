const AUTHORIZATION_ENDPOINT =
    "https://discord.com/oauth2/authorize";
const TOKEN_ENDPOINT =
    "https://discord.com/api/oauth2/token";
const REVOCATION_ENDPOINT =
    "https://discord.com/api/oauth2/token/revoke";
const API_ROOT = "https://discord.com/api/v10";
const REQUIRED_SCOPES = Object.freeze([
    "identify",
    "guilds.members.read"
]);
const MAXIMUM_DISCORD_SNOWFLAKE = (1n << 64n) - 1n;

class DiscordOAuthRequestError extends Error {

    constructor(kind, retryable = false) {
        super("Discord OAuth request failed.");
        this.name = "DiscordOAuthRequestError";
        this.kind = kind;
        this.retryable = retryable;
    }

}

class DiscordOAuthClient {

    constructor({
        callbackUri,
        clientId,
        clientSecret,
        createTimeoutSignal =
        milliseconds =>
            globalThis.AbortSignal.timeout(
                milliseconds
            ),
        fetchImplementation = globalThis.fetch,
        guildId,
        requestTimeoutMs
    } = {}) {

        this.validateSnowflake(clientId, "client ID");
        this.validateSnowflake(guildId, "guild ID");

        if (
            typeof clientSecret !== "string" ||
            clientSecret.length === 0
        ) {
            throw new Error(
                "Discord OAuth client secret is required."
            );
        }

        if (
            typeof callbackUri !== "string" ||
            callbackUri.length === 0
        ) {
            throw new Error(
                "Discord OAuth callback URI is required."
            );
        }

        if (
            !Number.isSafeInteger(requestTimeoutMs) ||
            requestTimeoutMs < 1
        ) {
            throw new Error(
                "Discord OAuth request timeout must be a positive safe integer."
            );
        }

        if (typeof fetchImplementation !== "function") {
            throw new Error(
                "Discord OAuth fetch boundary must be a function."
            );
        }

        if (typeof createTimeoutSignal !== "function") {
            throw new Error(
                "Discord OAuth timeout boundary must be a function."
            );
        }

        this.callbackUri = callbackUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.createTimeoutSignal = createTimeoutSignal;
        this.fetchImplementation = fetchImplementation;
        this.guildId = guildId;
        this.requestTimeoutMs = requestTimeoutMs;

    }

    createAuthorizationUrl({
        codeChallenge,
        state
    } = {}) {

        this.validateSecret(
            codeChallenge,
            "Discord OAuth PKCE challenge"
        );
        this.validateSecret(
            state,
            "Discord OAuth state"
        );

        const url = new URL(AUTHORIZATION_ENDPOINT);

        url.searchParams.set("response_type", "code");
        url.searchParams.set("client_id", this.clientId);
        url.searchParams.set(
            "redirect_uri",
            this.callbackUri
        );
        url.searchParams.set(
            "scope",
            REQUIRED_SCOPES.join(" ")
        );
        url.searchParams.set("state", state);
        url.searchParams.set(
            "code_challenge",
            codeChallenge
        );
        url.searchParams.set(
            "code_challenge_method",
            "S256"
        );

        return url.toString();

    }

    async exchangeCode(code, codeVerifier) {

        this.validateSecret(
            code,
            "Discord OAuth authorization code"
        );
        this.validateSecret(
            codeVerifier,
            "Discord OAuth PKCE verifier"
        );

        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: this.callbackUri,
            code_verifier: codeVerifier
        });
        const response = await this.performRequest(
            TOKEN_ENDPOINT,
            {
                body: body.toString(),
                headers: this.createClientHeaders(),
                method: "POST"
            }
        );
        const payload = await this.readJson(response);

        if (
            typeof payload.access_token !== "string" ||
            payload.access_token.length === 0 ||
            payload.token_type !== "Bearer" ||
            typeof payload.scope !== "string"
        ) {
            throw new DiscordOAuthRequestError(
                "operational"
            );
        }

        const scopes = new Set(
            payload.scope.split(/\s+/).filter(Boolean)
        );

        for (const scope of REQUIRED_SCOPES) {

            if (!scopes.has(scope)) {
                throw new DiscordOAuthRequestError(
                    "authorization"
                );
            }

        }

        if (
            payload.refresh_token !== undefined &&
            (
                typeof payload.refresh_token !== "string" ||
                payload.refresh_token.length === 0
            )
        ) {
            throw new DiscordOAuthRequestError(
                "operational"
            );
        }

        return Object.freeze({
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token ?? null
        });

    }

    async fetchCurrentUser(accessToken) {

        const response = await this.performBearerRequest(
            `${API_ROOT}/users/@me`,
            accessToken
        );
        const payload = await this.readJson(response);

        try {
            this.validateSnowflake(
                payload?.id,
                "user ID"
            );
        } catch {
            throw new DiscordOAuthRequestError(
                "identity"
            );
        }

        if (
            typeof payload.username !== "string" ||
            payload.username.trim().length === 0 ||
            (
                payload.global_name !== null &&
                payload.global_name !== undefined &&
                typeof payload.global_name !== "string"
            ) ||
            (
                payload.bot !== undefined &&
                typeof payload.bot !== "boolean"
            ) ||
            (
                payload.system !== undefined &&
                typeof payload.system !== "boolean"
            )
        ) {
            throw new DiscordOAuthRequestError(
                "identity"
            );
        }

        return Object.freeze({
            bot: payload.bot === true,
            globalName: payload.global_name ?? null,
            id: payload.id,
            system: payload.system === true,
            username: payload.username
        });

    }

    async fetchCurrentGuildMember(accessToken) {

        const response = await this.performBearerRequest(
            `${API_ROOT}/users/@me/guilds/` +
            `${this.guildId}/member`,
            accessToken,
            true
        );
        const payload = await this.readJson(response);

        if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload) ||
            (
                payload.nick !== null &&
                payload.nick !== undefined &&
                typeof payload.nick !== "string"
            ) ||
            (
                payload.pending !== undefined &&
                typeof payload.pending !== "boolean"
            ) ||
            !Number.isSafeInteger(payload.flags) ||
            payload.flags < 0
        ) {
            throw new DiscordOAuthRequestError(
                "identity"
            );
        }

        return Object.freeze({
            flags: payload.flags,
            nick: payload.nick ?? null,
            pending: payload.pending === true
        });

    }

    async revokeGrant(accessToken) {

        this.validateSecret(
            accessToken,
            "Discord OAuth access token"
        );

        let lastError;

        for (let attempt = 0; attempt < 2; attempt += 1) {

            try {

                await this.performRequest(
                    REVOCATION_ENDPOINT,
                    {
                        body: new URLSearchParams({
                            token: accessToken,
                            token_type_hint:
                                "access_token"
                        }).toString(),
                        headers:
                            this.createClientHeaders(),
                        method: "POST"
                    }
                );

                return;

            } catch (error) {

                lastError = error;

                if (
                    !(error instanceof
                        DiscordOAuthRequestError) ||
                    !error.retryable ||
                    attempt === 1
                ) {
                    throw error;
                }

            }

        }

        throw lastError;

    }

    async performBearerRequest(
        url,
        accessToken,
        membershipRequest = false
    ) {

        this.validateSecret(
            accessToken,
            "Discord OAuth access token"
        );

        return this.performRequest(
            url,
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                },
                method: "GET"
            },
            membershipRequest
        );

    }

    async performRequest(
        url,
        options,
        membershipRequest = false
    ) {

        let response;

        try {
            response = await this.fetchImplementation(
                url,
                {
                    ...options,
                    signal: this.createTimeoutSignal(
                        this.requestTimeoutMs
                    )
                }
            );
        } catch (error) {
            throw new DiscordOAuthRequestError(
                "operational",
                error?.name === "AbortError" ||
                error?.name === "TimeoutError"
            );
        }

        if (
            !response ||
            typeof response.ok !== "boolean" ||
            !Number.isInteger(response.status)
        ) {
            throw new DiscordOAuthRequestError(
                "operational"
            );
        }

        if (response.ok) {
            return response;
        }

        if (
            membershipRequest &&
            response.status === 404
        ) {
            throw new DiscordOAuthRequestError(
                "membership"
            );
        }

        if (response.status === 429) {
            throw new DiscordOAuthRequestError(
                "operational",
                true
            );
        }

        if (response.status >= 500) {
            throw new DiscordOAuthRequestError(
                "operational",
                true
            );
        }

        throw new DiscordOAuthRequestError(
            "authorization"
        );

    }

    async readJson(response) {

        if (typeof response.json !== "function") {
            throw new DiscordOAuthRequestError(
                "operational"
            );
        }

        try {

            const payload = await response.json();

            if (
                !payload ||
                typeof payload !== "object" ||
                Array.isArray(payload)
            ) {
                throw new Error("Invalid payload.");
            }

            return payload;

        } catch {
            throw new DiscordOAuthRequestError(
                "operational"
            );
        }

    }

    createClientHeaders() {
        return {
            Authorization:
                "Basic " +
                Buffer.from(
                    `${this.clientId}:${this.clientSecret}`,
                    "utf8"
                ).toString("base64"),
            "Content-Type":
                "application/x-www-form-urlencoded"
        };
    }

    validateSnowflake(value, name) {

        if (
            typeof value !== "string" ||
            !/^[0-9]+$/.test(value)
        ) {
            throw new Error(
                `Discord OAuth ${name} is invalid.`
            );
        }

        const snowflake = BigInt(value);

        if (
            snowflake < 1n ||
            snowflake > MAXIMUM_DISCORD_SNOWFLAKE
        ) {
            throw new Error(
                `Discord OAuth ${name} is invalid.`
            );
        }

    }

    validateSecret(value, name) {

        if (
            typeof value !== "string" ||
            value.length === 0
        ) {
            throw new Error(`${name} is required.`);
        }

    }

}

DiscordOAuthClient.RequestError =
    DiscordOAuthRequestError;

module.exports = DiscordOAuthClient;
const {
    URL,
    URLSearchParams
} = require("node:url");
