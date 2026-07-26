const {
    createHash,
    randomBytes
} = require("node:crypto");
const DiscordOAuthClient = require(
    "./DiscordOAuthClient"
);

const RANDOM_VALUE_BYTES = 32;
const DISCORD_GUEST_FLAG = 1 << 4;

class WebsiteOAuthFlow {

    constructor({
        cookieService,
        oauthClient,
        randomBytesSource = randomBytes,
        sessionStore,
        stateStore
    } = {}) {

        this.validateBoundary(
            cookieService,
            [
                "readOAuthBindingCookie",
                "readSessionCookie",
                "createOAuthBindingCookie",
                "clearOAuthBindingCookie",
                "createSessionCookie",
                "clearSessionCookie"
            ],
            "cookie service"
        );
        this.validateBoundary(
            oauthClient,
            [
                "createAuthorizationUrl",
                "exchangeCode",
                "fetchCurrentUser",
                "fetchCurrentGuildMember",
                "revokeGrant"
            ],
            "Discord OAuth client"
        );
        this.validateBoundary(
            sessionStore,
            ["create", "revoke"],
            "session store"
        );
        this.validateBoundary(
            stateStore,
            ["save", "consume"],
            "OAuth state store"
        );

        if (typeof randomBytesSource !== "function") {
            throw new Error(
                "Website OAuth random source must be a function."
            );
        }

        this.cookieService = cookieService;
        this.oauthClient = oauthClient;
        this.randomBytesSource = randomBytesSource;
        this.sessionStore = sessionStore;
        this.stateStore = stateStore;
        this.stopping = false;

    }

    beginLogin() {

        if (this.stopping) {
            return this.createResult(503);
        }

        try {

            const state = this.createRandomValue();
            const codeVerifier =
                this.createRandomValue();
            const browserBinding =
                this.createRandomValue();
            const codeChallenge = createHash("sha256")
                .update(codeVerifier, "ascii")
                .digest("base64url");
            const location =
                this.oauthClient.createAuthorizationUrl({
                    codeChallenge,
                    state
                });

            this.stateStore.save({
                browserBinding,
                codeVerifier,
                state
            });

            return this.createResult(
                303,
                {
                    cookies: [
                        this.cookieService
                            .createOAuthBindingCookie(
                                browserBinding
                            )
                    ],
                    location
                }
            );

        } catch {
            return this.createResult(503);
        }

    }

    async completeCallback({
        callback,
        request
    } = {}) {

        const clearBinding =
            this.cookieService
                .clearOAuthBindingCookie();
        const failure = statusCode =>
            this.createResult(statusCode, {
                cookies: [clearBinding]
            });

        if (
            !callback ||
            typeof callback !== "object" ||
            callback.malformed === true ||
            typeof callback.state !== "string" ||
            callback.state.length === 0
        ) {
            return failure(400);
        }

        const binding =
            this.cookieService
                .readOAuthBindingCookie(request);

        if (
            !binding.present ||
            !binding.valid ||
            binding.token === null
        ) {
            return failure(400);
        }

        let attempt;

        try {
            attempt = this.stateStore.consume(
                callback.state,
                binding.token
            );
        } catch {
            return failure(503);
        }

        if (attempt === null) {
            return failure(400);
        }

        if (callback.error !== null) {
            return failure(
                callback.error === "access_denied"
                    ? 401
                    : 400
            );
        }

        if (
            typeof callback.code !== "string" ||
            callback.code.length === 0
        ) {
            return failure(400);
        }

        if (this.stopping) {
            return failure(503);
        }

        let tokens = null;
        let identity = null;
        let outcomeStatus = 503;

        try {

            tokens = await this.oauthClient.exchangeCode(
                callback.code,
                attempt.codeVerifier
            );
            const user =
                await this.oauthClient.fetchCurrentUser(
                    tokens.accessToken
                );

            if (user.bot || user.system) {
                outcomeStatus = 403;
            } else {

                const member =
                    await this.oauthClient
                        .fetchCurrentGuildMember(
                            tokens.accessToken
                        );

                if (
                    member.pending ||
                    (
                        member.flags &
                        DISCORD_GUEST_FLAG
                    ) !== 0
                ) {
                    outcomeStatus = 403;
                } else {
                    identity = this.createIdentity(
                        user,
                        member
                    );
                    outcomeStatus = 200;
                }

            }

        } catch (error) {
            outcomeStatus = this.mapOAuthError(error);
        }

        if (tokens !== null) {

            try {
                await this.oauthClient.revokeGrant(
                    tokens.accessToken
                );
            } catch {
                return failure(503);
            } finally {
                tokens = null;
            }

        }

        if (
            outcomeStatus !== 200 ||
            identity === null ||
            this.stopping
        ) {
            return failure(
                this.stopping
                    ? 503
                    : outcomeStatus
            );
        }

        try {

            const existingSession =
                this.cookieService
                    .readSessionCookie(request);

            if (
                existingSession.present &&
                existingSession.valid &&
                existingSession.token !== null
            ) {
                this.sessionStore.revoke(
                    existingSession.token
                );
            }

            const session =
                this.sessionStore.create(identity);

            return this.createResult(
                303,
                {
                    cookies: [
                        clearBinding,
                        this.cookieService
                            .createSessionCookie(
                                session.token
                            )
                    ],
                    location: "/api/me"
                }
            );

        } catch {
            return failure(503);
        }

    }

    logout(request, publicOrigin) {

        if (
            request?.headers?.origin !== publicOrigin
        ) {
            return this.createResult(403);
        }

        try {

            const session =
                this.cookieService
                    .readSessionCookie(request);

            if (
                session.present &&
                session.valid &&
                session.token !== null
            ) {
                this.sessionStore.revoke(
                    session.token
                );
            }

            return this.createResult(
                204,
                {
                    cookies: [
                        this.cookieService
                            .clearSessionCookie(),
                        this.cookieService
                            .clearOAuthBindingCookie()
                    ]
                }
            );

        } catch {
            return this.createResult(503);
        }

    }

    beginShutdown() {
        this.stopping = true;
    }

    createIdentity(user, member) {

        const candidates = [
            member.nick,
            user.globalName,
            user.username
        ];
        const displayName = candidates.find(
            value =>
                typeof value === "string" &&
                value.trim().length > 0
        );

        if (
            typeof user.id !== "string" ||
            user.id.trim().length === 0 ||
            displayName === undefined
        ) {
            throw new Error(
                "Discord identity is invalid."
            );
        }

        return Object.freeze({
            actorId: user.id.trim(),
            displayName: displayName.trim(),
            permissions: Object.freeze([])
        });

    }

    mapOAuthError(error) {

        if (
            error instanceof
            DiscordOAuthClient.RequestError
        ) {

            if (
                error.kind === "membership" ||
                error.kind === "identity"
            ) {
                return 403;
            }

            if (error.kind === "authorization") {
                return 401;
            }

        }

        return 503;

    }

    createRandomValue() {

        const bytes =
            this.randomBytesSource(RANDOM_VALUE_BYTES);

        if (
            !Buffer.isBuffer(bytes) ||
            bytes.length < RANDOM_VALUE_BYTES
        ) {
            throw new Error(
                "Website OAuth random source returned insufficient bytes."
            );
        }

        return bytes
            .subarray(0, RANDOM_VALUE_BYTES)
            .toString("base64url");

    }

    createResult(
        statusCode,
        {
            cookies = [],
            location = null
        } = {}
    ) {
        return Object.freeze({
            cookies: Object.freeze([...cookies]),
            location,
            statusCode
        });
    }

    validateBoundary(boundary, methods, name) {

        if (
            !boundary ||
            methods.some(
                method =>
                    typeof boundary[method] !==
                    "function"
            )
        ) {
            throw new Error(
                `Website ${name} boundary is invalid.`
            );
        }

    }

}

module.exports = WebsiteOAuthFlow;
