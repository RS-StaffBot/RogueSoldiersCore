const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
    URL,
    URLSearchParams
} = require("node:url");

const DiscordOAuthClient = require(
    "../../../src/providers/website/DiscordOAuthClient"
);

const configuration = {
    callbackUri:
        "https://community.example/auth/discord/callback",
    clientId: "123456789012345678",
    clientSecret: "client-secret",
    guildId: "223456789012345678",
    requestTimeoutMs: 10000
};

function createResponse(status, payload = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        async json() {
            return payload;
        }
    };
}

function createHarness(responses = []) {

    const requests = [];
    const signals = [];
    const queue = [...responses];
    const client = new DiscordOAuthClient({
        ...configuration,
        createTimeoutSignal(milliseconds) {
            signals.push(milliseconds);

            return Symbol("timeout-signal");
        },
        async fetchImplementation(url, options) {
            requests.push({
                options,
                url
            });

            const response = queue.shift();

            if (response instanceof Error) {
                throw response;
            }

            return response;
        }
    });

    return {
        client,
        requests,
        signals
    };

}

test("builds the exact safe authorization URL", () => {

    const client = createHarness().client;
    const url = new URL(
        client.createAuthorizationUrl({
            codeChallenge: "challenge",
            state: "state"
        })
    );

    assert.strictEqual(
        url.origin + url.pathname,
        "https://discord.com/oauth2/authorize"
    );
    assert.deepStrictEqual(
        Object.fromEntries(url.searchParams),
        {
            response_type: "code",
            client_id: configuration.clientId,
            redirect_uri: configuration.callbackUri,
            scope: "identify guilds.members.read",
            state: "state",
            code_challenge: "challenge",
            code_challenge_method: "S256"
        }
    );
    assert.strictEqual(
        url.toString().includes(configuration.clientSecret),
        false
    );

});

test("exchanges a code with exact form and Basic authentication", async () => {

    const harness = createHarness([
        createResponse(200, {
            access_token: "access-token",
            refresh_token: "refresh-token",
            scope: "identify guilds.members.read",
            token_type: "Bearer"
        })
    ]);
    const tokens = await harness.client.exchangeCode(
        "authorization-code",
        "pkce-verifier"
    );
    const request = harness.requests[0];
    const body = Object.fromEntries(
        new URLSearchParams(request.options.body)
    );

    assert.strictEqual(
        request.url,
        "https://discord.com/api/oauth2/token"
    );
    assert.strictEqual(request.options.method, "POST");
    assert.strictEqual(
        request.options.headers["Content-Type"],
        "application/x-www-form-urlencoded"
    );
    assert.strictEqual(
        request.options.headers.Authorization,
        "Basic " +
        Buffer.from(
            configuration.clientId + ":" +
            configuration.clientSecret
        ).toString("base64")
    );
    assert.deepStrictEqual(body, {
        grant_type: "authorization_code",
        code: "authorization-code",
        redirect_uri: configuration.callbackUri,
        code_verifier: "pkce-verifier"
    });
    assert.deepStrictEqual(tokens, {
        accessToken: "access-token",
        refreshToken: "refresh-token"
    });
    assert.deepStrictEqual(harness.signals, [10000]);

});

test("fetches allowlisted user and guild-member data", async () => {

    const harness = createHarness([
        createResponse(200, {
            id: "323456789012345678",
            username: "rogue",
            global_name: "Rogue",
            bot: false,
            system: false,
            ignored: "value"
        }),
        createResponse(200, {
            nick: "Soldier",
            pending: false,
            flags: 0,
            roles: ["ignored"]
        })
    ]);

    const user =
        await harness.client.fetchCurrentUser("token");
    const member =
        await harness.client.fetchCurrentGuildMember(
            "token"
        );

    assert.deepStrictEqual(user, {
        bot: false,
        globalName: "Rogue",
        id: "323456789012345678",
        system: false,
        username: "rogue"
    });
    assert.deepStrictEqual(member, {
        flags: 0,
        nick: "Soldier",
        pending: false
    });
    assert.strictEqual(
        harness.requests[0].url,
        "https://discord.com/api/v10/users/@me"
    );
    assert.strictEqual(
        harness.requests[1].url,
        "https://discord.com/api/v10/users/@me/guilds/" +
        configuration.guildId + "/member"
    );

    for (const request of harness.requests) {
        assert.strictEqual(
            request.options.headers.Authorization,
            "Bearer token"
        );
    }

});

test("revokes with exact form and retries one transient failure", async () => {

    const harness = createHarness([
        createResponse(429),
        createResponse(200)
    ]);

    await harness.client.revokeGrant("access-token");

    assert.strictEqual(harness.requests.length, 2);

    for (const request of harness.requests) {
        assert.strictEqual(
            request.url,
            "https://discord.com/api/oauth2/token/revoke"
        );
        assert.deepStrictEqual(
            Object.fromEntries(
                new URLSearchParams(
                    request.options.body
                )
            ),
            {
                token: "access-token",
                token_type_hint: "access_token"
            }
        );
    }

});

test("does not generally retry 4xx or 5xx requests", async () => {

    for (const response of [
        createResponse(400),
        createResponse(500)
    ]) {

        const harness = createHarness([response]);

        await assert.rejects(
            harness.client.exchangeCode("code", "verifier"),
            error =>
                error instanceof
                    DiscordOAuthClient.RequestError &&
                error.message ===
                    "Discord OAuth request failed."
        );
        assert.strictEqual(harness.requests.length, 1);

    }

});

test("maps membership absence without exposing Discord data", async () => {

    const harness = createHarness([
        createResponse(404, {
            message: "secret Discord response"
        })
    ]);

    await assert.rejects(
        harness.client.fetchCurrentGuildMember("token"),
        error => (
            error.kind === "membership" &&
            !error.message.includes("secret") &&
            !error.message.includes("token")
        )
    );

});

test("maps timeout and malformed JSON safely", async () => {

    const timeout = new Error("secret timeout");

    timeout.name = "TimeoutError";

    const timeoutHarness = createHarness([timeout]);

    await assert.rejects(
        timeoutHarness.client.fetchCurrentUser(
            "secret-token"
        ),
        error => (
            error.retryable === true &&
            error.message ===
                "Discord OAuth request failed."
        )
    );

    const malformedHarness = createHarness([{
        ok: true,
        status: 200,
        async json() {
            throw new Error("secret body");
        }
    }]);

    await assert.rejects(
        malformedHarness.client.exchangeCode(
            "secret-code",
            "secret-verifier"
        ),
        error => (
            error.message ===
                "Discord OAuth request failed." &&
            !error.message.includes("secret")
        )
    );

});

test("rejects missing required token and identity fields", async () => {

    const tokenHarness = createHarness([
        createResponse(200, {
            access_token: "token",
            scope: "identify",
            token_type: "Bearer"
        })
    ]);

    await assert.rejects(
        tokenHarness.client.exchangeCode(
            "code",
            "verifier"
        ),
        error => error.kind === "authorization"
    );

    const userHarness = createHarness([
        createResponse(200, {
            id: "invalid",
            username: "user"
        })
    ]);

    await assert.rejects(
        userHarness.client.fetchCurrentUser("token"),
        error =>
            error instanceof
                DiscordOAuthClient.RequestError &&
            error.kind === "identity"
    );

});
