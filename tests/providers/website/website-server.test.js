const { test } = require("node:test");
const assert = require("node:assert/strict");

const WebsiteServer = require(
    "../../../src/providers/website/WebsiteServer"
);
const FakeHttpServer = require(
    "./fakes/FakeHttpServer"
);
const FakeWebsiteAuthenticator = require(
    "./fakes/FakeWebsiteAuthenticator"
);
const FakeWebsiteOAuthFlow = require(
    "./fakes/FakeWebsiteOAuthFlow"
);

const defaultOptions = Object.freeze({
    host: "127.0.0.1",
    port: 8080,
    requestTimeoutMs: 10000,
    shutdownTimeoutMs: 5000
});

function createHarness({
    authenticator = undefined,
    autoClose = true,
    autoListen = true,
    cookieService = null,
    listenError = null,
    oauthFlow = null,
    publicOrigin = null,
    ticketService = null,
    timers = null } = {}) {

    let httpServer;
    let factoryCount = 0;
    const timerHarness = timers || {
        clearTimer() {},
        setTimer() {
            return Symbol("timer");
        }
    };
    const resolvedCookieService =
        cookieService === null
            ? null
            : {
                clearOAuthBindingCookie() {
                    return "clear-binding";
                },
                ...cookieService
            };
    const server = new WebsiteServer({
        authenticator,
        clearTimer: timerHarness.clearTimer,
        cookieService: resolvedCookieService,
        createServer(options, requestListener) {
            factoryCount += 1;
            httpServer = new FakeHttpServer({
                autoClose,
                autoListen,
                listenError,
                requestListener,
                serverOptions: options
            });

            return httpServer;
        },
        oauthFlow,
        publicOrigin,
        setTimer: timerHarness.setTimer,
        ticketService
    });

    return {
        get factoryCount() {
            return factoryCount;
        },
        get httpServer() {
            return httpServer;
        },
        server,
        timerHarness
    };

}

test("constructs an injected HTTP server and listens as configured", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    assert.strictEqual(harness.factoryCount, 1);
    assert.deepStrictEqual(
        harness.httpServer.serverOptions,
        {
            requestTimeout: 10000
        }
    );
    assert.deepStrictEqual(
        harness.httpServer.listenCalls,
        [
            {
                host: "127.0.0.1",
                port: 8080
            }
        ]
    );

    await harness.server.stop();

});

test("accepts port zero only at the direct server boundary", async () => {

    const harness = createHarness();

    await harness.server.start({
        ...defaultOptions,
        port: 0
    });

    assert.deepStrictEqual(
        harness.httpServer.listenCalls,
        [
            {
                host: "127.0.0.1",
                port: 0
            }
        ]
    );

    await harness.server.stop();

});

test("start resolves only after listening", async () => {

    const harness = createHarness({
        autoListen: false
    });
    let startupFinished = false;
    const startup = harness.server
        .start(defaultOptions)
        .then(() => {
            startupFinished = true;
        });

    await Promise.resolve();

    assert.strictEqual(startupFinished, false);

    harness.httpServer.reportListening();
    await startup;

    assert.strictEqual(startupFinished, true);

    await harness.server.stop();

});

test("GET health returns the exact safe response", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request();

    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(
        response.headers,
        {
            "cache-control": "no-store",
            "content-type":
                "application/json; charset=utf-8",
            "x-content-type-options": "nosniff"
        }
    );
    assert.strictEqual(
        response.body,
        "{\"service\":\"website-provider\",\"status\":\"ok\"}"
    );
    assert.strictEqual(
        Object.hasOwn(response.headers, "access-control-allow-origin"),
        false
    );
    assert.strictEqual(
        Object.hasOwn(response.headers, "set-cookie"),
        false
    );

    await harness.server.stop();

});

test("POST health returns 405 without processing a body", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "POST"
    });

    assert.strictEqual(response.statusCode, 405);
    assert.strictEqual(response.headers.allow, "GET");
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Method not allowed."
        }
    );

    await harness.server.stop();

});

test("unknown routes return a generic 404 response", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        url: "/private/configuration"
    });

    assert.strictEqual(response.statusCode, 404);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Not found."
        }
    );
    assert.strictEqual(
        response.body.includes("private"),
        false
    );
    assert.strictEqual(
        response.body.includes("configuration"),
        false
    );

    await harness.server.stop();

});

test("rejects an invalid authenticator boundary", () => {

    assert.throws(
        () => new WebsiteServer({
            authenticator: {}
        }),
        {
            message:
                "Website authenticator must provide an " +
                "authenticate operation."
        }
    );

});

test("GET api me denies production authentication", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        url: "/api/me"
    });

    assert.strictEqual(response.statusCode, 401);
    assert.deepStrictEqual(
        response.headers,
        {
            "cache-control": "no-store",
            "content-type":
                "application/json; charset=utf-8",
            "x-content-type-options": "nosniff"
        }
    );
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Authentication required."
        }
    );
    assert.strictEqual(
        Object.hasOwn(
            response.headers,
            "www-authenticate"
        ),
        false
    );

    await harness.server.stop();

});

test("GET api me denies a fake unauthenticated result", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator();
    const harness = createHarness({
        authenticator
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        headers: {
            authorization: "untrusted"
        },
        url: "/api/me"
    });

    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(
        authenticator.authenticateCalls.length,
        1
    );
    assert.strictEqual(
        authenticator.authenticateCalls[0].headers
            .authorization,
        "untrusted"
    );

    await harness.server.stop();

});

test("GET api me returns an exact allowlisted identity", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            identity: {
                actorId: " actor-1 ",
                displayName: " Example ",
                permissions: [
                    "tickets.view-all",
                    "tickets.view-all",
                    " tickets.respond "
                ],
                accessToken: "secret-token",
                sessionId: "secret-session",
                guild: {
                    id: "internal-guild"
                }
            }
        });
    const harness = createHarness({
        authenticator
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        headers: {
            authorization: "secret-header"
        },
        url: "/api/me"
    });

    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            authenticated: true,
            actor: {
                actorId: "actor-1",
                displayName: "Example",
                permissions: [
                    "tickets.view-all",
                    "tickets.respond"
                ]
            }
        }
    );
    assert.strictEqual(
        response.body.includes("secret"),
        false
    );
    assert.strictEqual(
        response.body.includes("guild"),
        false
    );
    assert.strictEqual(
        Object.hasOwn(
            response.headers,
            "set-cookie"
        ),
        false
    );
    assert.strictEqual(
        Object.hasOwn(
            response.headers,
            "access-control-allow-origin"
        ),
        false
    );

    await harness.server.stop();

});

test("authenticated actor permissions use a defensive snapshot", () => {

    const harness = createHarness();
    const identity = {
        actorId: "actor-1",
        displayName: "Example",
        permissions: [
            "tickets.view-all"
        ]
    };
    const actor = harness.server.createActorSnapshot(
        identity
    );

    identity.permissions.push("tickets.respond");

    assert.deepStrictEqual(
        actor.permissions,
        ["tickets.view-all"]
    );
    assert.strictEqual(Object.isFrozen(actor), true);
    assert.strictEqual(
        Object.isFrozen(actor.permissions),
        true
    );
    assert.throws(() => {
        actor.permissions.push("tickets.assign");
    });

});

test("invalid authenticated identities fail closed", async () => {

    const invalidIdentities = [
        {},
        {
            actorId: "",
            displayName: "Example",
            permissions: []
        },
        {
            actorId: "actor-1",
            displayName: " ",
            permissions: []
        },
        {
            actorId: "actor-1",
            displayName: "Example",
            permissions: null
        },
        {
            actorId: "actor-1",
            displayName: "Example",
            permissions: [""]
        },
        {
            actorId: "actor-1",
            displayName: "Example",
            permissions: [7]
        }
    ];

    for (const identity of invalidIdentities) {

        const authenticator =
            new FakeWebsiteAuthenticator({
                identity
            });
        const harness = createHarness({
            authenticator
        });

        await harness.server.start(defaultOptions);

        const response =
            await harness.httpServer.request({
                url: "/api/me"
            });

        assert.strictEqual(response.statusCode, 401);
        assert.deepStrictEqual(
            JSON.parse(response.body),
            {
                error: "Authentication required."
            }
        );

        await harness.server.stop();

    }

});

test("authenticator failures return a generic 503", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            async authenticate() {
                throw new Error(
                    "Discord token exchange exposed secret."
                );
            }
        });
    const harness = createHarness({
        authenticator
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        url: "/api/me"
    });

    assert.strictEqual(response.statusCode, 503);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Service unavailable."
        }
    );
    assert.strictEqual(
        response.body.includes("Discord"),
        false
    );
    assert.strictEqual(
        response.body.includes("secret"),
        false
    );

    const healthResponse =
        await harness.httpServer.request();

    assert.strictEqual(healthResponse.statusCode, 200);

    await harness.server.stop();

});

test("POST api me returns 405 without authentication", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            identity: {
                actorId: "actor-1",
                displayName: "Example",
                permissions: []
            }
        });
    const harness = createHarness({
        authenticator
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "POST",
        url: "/api/me"
    });

    assert.strictEqual(response.statusCode, 405);
    assert.strictEqual(response.headers.allow, "GET");
    assert.strictEqual(
        authenticator.authenticateCalls.length,
        0
    );

    await harness.server.stop();

});

test("health and unknown routes do not authenticate", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            identity: {
                actorId: "actor-1",
                displayName: "Example",
                permissions: []
            }
        });
    const harness = createHarness({
        authenticator
    });

    await harness.server.start(defaultOptions);

    const healthResponse =
        await harness.httpServer.request();
    const unknownResponse =
        await harness.httpServer.request({
            url: "/unknown"
        });

    assert.strictEqual(healthResponse.statusCode, 200);
    assert.strictEqual(unknownResponse.statusCode, 404);
    assert.strictEqual(
        authenticator.authenticateCalls.length,
        0
    );

    await harness.server.stop();

});

test("validates options before creating an HTTP server", async () => {

    const invalidOptions = [
        {
            ...defaultOptions,
            host: "0.0.0.0"
        },
        {
            ...defaultOptions,
            port: -1
        },
        {
            ...defaultOptions,
            requestTimeoutMs: 0
        },
        {
            ...defaultOptions,
            shutdownTimeoutMs: 0
        }
    ];

    for (const options of invalidOptions) {

        const harness = createHarness();

        await assert.rejects(
            harness.server.start(options)
        );
        assert.strictEqual(harness.factoryCount, 0);

    }

});

test("listen failure rejects and permits safe shutdown", async () => {

    const listenError = new Error(
        "Address already in use."
    );
    const harness = createHarness({
        listenError
    });

    await assert.rejects(
        harness.server.start(defaultOptions),
        error => error === listenError
    );

    await harness.server.stop();

    assert.strictEqual(
        harness.httpServer.closeCount,
        0
    );

});

test("unexpected post-readiness error notifies once", async () => {

    const harness = createHarness();
    const reportedErrors = [];

    await harness.server.start(
        defaultOptions,
        error => {
            reportedErrors.push(error);
        }
    );

    const serverError = new Error(
        "HTTP server failed."
    );

    harness.httpServer.reportError(serverError);
    harness.httpServer.reportError(
        new Error("Duplicate error.")
    );

    assert.deepStrictEqual(
        reportedErrors,
        [serverError]
    );

    await harness.server.stop();

});

test("error followed by close still notifies once", async () => {

    const harness = createHarness();
    let notificationCount = 0;

    await harness.server.start(
        defaultOptions,
        () => {
            notificationCount += 1;
        }
    );

    harness.httpServer.reportError();
    harness.httpServer.reportUnexpectedClose();

    assert.strictEqual(notificationCount, 1);

    await harness.server.stop();

});

test("unexpected close without error notifies once", async () => {

    const harness = createHarness();
    const reportedErrors = [];

    await harness.server.start(
        defaultOptions,
        error => {
            reportedErrors.push(error);
        }
    );

    harness.httpServer.reportUnexpectedClose();
    harness.httpServer.reportUnexpectedClose();

    assert.strictEqual(reportedErrors.length, 1);
    assert.strictEqual(
        reportedErrors[0].message,
        "Website server closed unexpectedly."
    );

    await harness.server.stop();

});

test("callback exceptions do not escape server-loss cleanup", async () => {

    const harness = createHarness();

    await harness.server.start(
        defaultOptions,
        () => {
            throw new Error(
                "Provider callback failed."
            );
        }
    );

    assert.doesNotThrow(() => {
        harness.httpServer.reportUnexpectedClose();
    });

    await harness.server.stop();

});

test("intentional shutdown does not notify unexpected loss", async () => {

    const harness = createHarness();
    let notificationCount = 0;

    await harness.server.start(
        defaultOptions,
        () => {
            notificationCount += 1;
        }
    );
    await harness.server.stop();

    assert.strictEqual(notificationCount, 0);

});

test("stop before start and repeated stop are safe", async () => {

    const harness = createHarness();

    await harness.server.stop();
    await harness.server.stop();

    assert.strictEqual(harness.factoryCount, 0);

});

test("stop after readiness awaits server close", async () => {

    const harness = createHarness({
        autoClose: false
    });

    await harness.server.start(defaultOptions);

    let stopFinished = false;
    const shutdown = harness.server
        .stop()
        .then(() => {
            stopFinished = true;
        });

    await Promise.resolve();

    assert.strictEqual(stopFinished, false);
    assert.strictEqual(
        harness.httpServer.closeCount,
        1
    );

    harness.httpServer.finishClose();
    await shutdown;

    assert.strictEqual(stopFinished, true);

});

test("shutdown timeout forces remaining connections closed", async () => {

    let timerCallback;
    const clearedTimers = [];
    const timer = Symbol("shutdown-timer");
    const harness = createHarness({
        autoClose: false,
        timers: {
            clearTimer(receivedTimer) {
                clearedTimers.push(receivedTimer);
            },
            setTimer(callback, delay) {
                assert.strictEqual(delay, 5000);
                timerCallback = callback;

                return timer;
            }
        }
    });

    await harness.server.start(defaultOptions);

    const shutdown = harness.server.stop();

    timerCallback();
    await shutdown;

    assert.strictEqual(
        harness.httpServer.closeAllConnectionsCount,
        1
    );
    assert.deepStrictEqual(clearedTimers, [timer]);

});

test("repeated concurrent stop closes only once", async () => {

    const harness = createHarness({
        autoClose: false
    });

    await harness.server.start(defaultOptions);

    const firstStop = harness.server.stop();
    const secondStop = harness.server.stop();

    assert.strictEqual(
        harness.httpServer.closeCount,
        1
    );

    harness.httpServer.finishClose();

    await Promise.all([
        firstStop,
        secondStop
    ]);

    assert.strictEqual(
        harness.httpServer.closeCount,
        1
    );

});

test("server listener and timer cleanup remains stable", async () => {

    const clearedTimers = [];
    const timer = Symbol("shutdown-timer");
    const harness = createHarness({
        timers: {
            clearTimer(receivedTimer) {
                clearedTimers.push(receivedTimer);
            },
            setTimer() {
                return timer;
            }
        }
    });

    await harness.server.start(defaultOptions);
    await harness.server.stop();

    assert.strictEqual(
        harness.httpServer.listenerCount("listening"),
        0
    );
    assert.strictEqual(
        harness.httpServer.listenerCount("error"),
        0
    );
    assert.strictEqual(
        harness.httpServer.listenerCount("close"),
        0
    );
    assert.deepStrictEqual(clearedTimers, [timer]);

    await harness.server.stop();

    assert.deepStrictEqual(clearedTimers, [timer]);

});

test("authentication routes remain hidden when disabled", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    for (const [method, url] of [
        ["GET", "/auth/discord"],
        ["GET", "/auth/discord/callback"],
        ["POST", "/auth/logout"]
    ]) {
        const response =
            await harness.httpServer.request({
                method,
                url
            });

        assert.strictEqual(response.statusCode, 404);
        assert.strictEqual(
            Object.hasOwn(
                response.headers,
                "set-cookie"
            ),
            false
        );
    }

    await harness.server.stop();

});

test("dispatches enabled login and callback routes safely", async () => {

    const oauthFlow = new FakeWebsiteOAuthFlow({
        beginLogin() {
            return {
                cookies: ["binding-cookie"],
                location:
                    "https://discord.com/oauth2/authorize",
                statusCode: 303
            };
        },
        completeCallback(input) {
            assert.deepStrictEqual(input.callback, {
                code: "code-1",
                error: null,
                malformed: false,
                state: "state-1"
            });

            return {
                cookies: [
                    "clear-binding",
                    "session-cookie"
                ],
                location: "/api/me",
                statusCode: 303
            };
        }
    });
    const harness = createHarness({
        cookieService: {
            clearSessionCookie() {
                return "clear-session";
            }
        },
        oauthFlow,
        publicOrigin:
            "https://community.example"
    });

    await harness.server.start(defaultOptions);

    const login =
        await harness.httpServer.request({
            url: "/auth/discord"
        });
    const callback =
        await harness.httpServer.request({
            url:
                "/auth/discord/callback" +
                "?code=code-1&state=state-1"
        });

    assert.strictEqual(login.statusCode, 303);
    assert.strictEqual(
        login.headers.location,
        "https://discord.com/oauth2/authorize"
    );
    assert.deepStrictEqual(
        login.headers["set-cookie"],
        ["binding-cookie"]
    );
    assert.strictEqual(
        login.headers["referrer-policy"],
        "no-referrer"
    );
    assert.strictEqual(callback.statusCode, 303);
    assert.strictEqual(
        callback.headers.location,
        "/api/me"
    );
    assert.deepStrictEqual(
        callback.headers["set-cookie"],
        ["clear-binding", "session-cookie"]
    );
    assert.strictEqual(callback.body, "");

    await harness.server.stop();

});

test("maps callback failures to generic responses", async () => {

    const statuses = [400, 401, 403, 503];

    for (const statusCode of statuses) {

        const oauthFlow =
            new FakeWebsiteOAuthFlow({
                completeCallback() {
                    return {
                        cookies: ["clear-binding"],
                        location: null,
                        statusCode
                    };
                }
            });
        const harness = createHarness({
            cookieService: {
                clearSessionCookie() {
                    return "clear-session";
                }
            },
            oauthFlow,
            publicOrigin:
                "https://community.example"
        });

        await harness.server.start(defaultOptions);

        const response =
            await harness.httpServer.request({
                url:
                    "/auth/discord/callback" +
                    "?error=access_denied" +
                    "&state=state-1"
            });

        assert.strictEqual(
            response.statusCode,
            statusCode
        );
        assert.deepStrictEqual(
            response.headers["set-cookie"],
            ["clear-binding"]
        );
        assert.strictEqual(
            response.body.includes("state-1"),
            false
        );

        await harness.server.stop();

    }

});

test("enforces authentication route methods", async () => {

    const oauthFlow = new FakeWebsiteOAuthFlow();
    const harness = createHarness({
        cookieService: {
            clearSessionCookie() {
                return "clear-session";
            }
        },
        oauthFlow,
        publicOrigin:
            "https://community.example"
    });

    await harness.server.start(defaultOptions);

    const login =
        await harness.httpServer.request({
            method: "POST",
            url: "/auth/discord"
        });
    const callback =
        await harness.httpServer.request({
            method: "POST",
            url: "/auth/discord/callback"
        });
    const logout =
        await harness.httpServer.request({
            method: "GET",
            url: "/auth/logout"
        });

    assert.strictEqual(login.statusCode, 405);
    assert.strictEqual(login.headers.allow, "GET");
    assert.strictEqual(callback.statusCode, 405);
    assert.strictEqual(callback.headers.allow, "GET");
    assert.strictEqual(logout.statusCode, 405);
    assert.strictEqual(logout.headers.allow, "POST");
    assert.strictEqual(
        oauthFlow.loginCount,
        0
    );

    await harness.server.stop();

});

test("logout delegates exact Origin policy and clears cookies", async () => {

    const origin =
        "https://community.example";
    const oauthFlow = new FakeWebsiteOAuthFlow({
        logout(request, publicOrigin) {
            assert.strictEqual(
                request.headers.origin,
                origin
            );
            assert.strictEqual(publicOrigin, origin);

            return {
                cookies: [
                    "clear-session",
                    "clear-binding"
                ],
                location: null,
                statusCode: 204
            };
        }
    });
    const harness = createHarness({
        cookieService: {
            clearSessionCookie() {
                return "clear-session";
            }
        },
        oauthFlow,
        publicOrigin: origin
    });

    await harness.server.start(defaultOptions);

    const response =
        await harness.httpServer.request({
            headers: {
                origin
            },
            method: "POST",
            url: "/auth/logout"
        });

    assert.strictEqual(response.statusCode, 204);
    assert.strictEqual(response.body, "");
    assert.deepStrictEqual(
        response.headers["set-cookie"],
        ["clear-session", "clear-binding"]
    );
    assert.strictEqual(
        Object.hasOwn(
            response.headers,
            "access-control-allow-origin"
        ),
        false
    );

    await harness.server.stop();

});

test("logout rejects missing and mismatched Origin without cookies", async () => {

    const origin =
        "https://community.example";
    const oauthFlow = new FakeWebsiteOAuthFlow({
        logout(request, publicOrigin) {
            assert.strictEqual(publicOrigin, origin);

            return {
                cookies: [],
                location: null,
                statusCode:
                    request.headers.origin ===
                        publicOrigin
                        ? 204
                        : 403
            };
        }
    });
    const harness = createHarness({
        cookieService: {
            clearSessionCookie() {
                return "clear-session";
            }
        },
        oauthFlow,
        publicOrigin: origin
    });

    await harness.server.start(defaultOptions);

    for (const headers of [
        {},
        {
            origin: "https://wrong.example"
        }
    ]) {
        const response =
            await harness.httpServer.request({
                headers,
                method: "POST",
                url: "/auth/logout"
            });

        assert.strictEqual(response.statusCode, 403);
        assert.strictEqual(
            Object.hasOwn(
                response.headers,
                "set-cookie"
            ),
            false
        );
        assert.deepStrictEqual(
            JSON.parse(response.body),
            {
                error: "Forbidden."
            }
        );
    }

    await harness.server.stop();

});

test("invalid api session clears the session cookie", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            clearSessionCookie: true
        });
    const harness = createHarness({
        authenticator,
        cookieService: {
            clearSessionCookie() {
                return "clear-session";
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response =
        await harness.httpServer.request({
            url: "/api/me"
        });

    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(
        response.headers["set-cookie"],
        "clear-session"
    );

    await harness.server.stop();

});

test("rejects an invalid Website Ticket service boundary", () => {

    assert.throws(
        () => new WebsiteServer({
            ticketService: {}
        }),
        {
            message:
                "Website Ticket service boundary is invalid."
        }
    );

});

test("Ticket route is hidden when no Ticket service exists", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            identity: {
                actorId: "member-1",
                displayName: "Member",
                permissions: []
            }
        });
    const harness = createHarness({
        authenticator
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "GET",
        url: "/api/tickets"
    });

    assert.strictEqual(response.statusCode, 404);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Not found."
        }
    );
    assert.strictEqual(
        authenticator.authenticateCalls.length,
        0
    );

    await harness.server.stop();

});

test("Ticket route requires GET without invoking authentication", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            identity: {
                actorId: "member-1",
                displayName: "Member",
                permissions: []
            }
        });
    const ticketCalls = [];
    const harness = createHarness({
        authenticator,
        ticketService: {
            listCreatorTickets(identity) {
                ticketCalls.push(identity);

                return {
                    tickets: []
                };
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "POST",
        url: "/api/tickets"
    });

    assert.strictEqual(response.statusCode, 405);
    assert.strictEqual(response.headers.allow, "GET");
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Method not allowed."
        }
    );
    assert.strictEqual(
        authenticator.authenticateCalls.length,
        0
    );
    assert.deepStrictEqual(ticketCalls, []);

    await harness.server.stop();

});

test("Ticket route returns 401 for a missing session", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator();
    const ticketCalls = [];
    const harness = createHarness({
        authenticator,
        ticketService: {
            listCreatorTickets(identity) {
                ticketCalls.push(identity);

                return {
                    tickets: []
                };
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "GET",
        url: "/api/tickets"
    });

    assert.strictEqual(response.statusCode, 401);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Authentication required."
        }
    );
    assert.deepStrictEqual(ticketCalls, []);

    await harness.server.stop();

});

test("Ticket route clears an invalid supplied session", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            clearSessionCookie: true
        });
    const harness = createHarness({
        authenticator,
        cookieService: {
            clearSessionCookie() {
                return "cleared-session-cookie";
            }
        },
        ticketService: {
            listCreatorTickets() {
                throw new Error(
                    "Ticket service must not be called."
                );
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "GET",
        url: "/api/tickets"
    });

    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(
        response.headers["set-cookie"],
        "cleared-session-cookie"
    );
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Authentication required."
        }
    );

    await harness.server.stop();

});

test("Ticket route returns 503 for authentication failure", async () => {

    const authenticator =
        new FakeWebsiteAuthenticator({
            authenticate() {
                throw new Error(
                    "Sensitive session-store failure."
                );
            }
        });
    const harness = createHarness({
        authenticator,
        ticketService: {
            listCreatorTickets() {
                return {
                    tickets: []
                };
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "GET",
        url: "/api/tickets"
    });

    assert.strictEqual(response.statusCode, 503);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Service unavailable."
        }
    );
    assert.strictEqual(
        response.body.includes("session-store"),
        false
    );

    await harness.server.stop();

});

test("Ticket route passes only authenticated identity to service", async () => {

    const identity = {
        actorId: "member-1",
        displayName: "Member",
        permissions: []
    };
    const authenticator =
        new FakeWebsiteAuthenticator({
            identity
        });
    const calls = [];
    const harness = createHarness({
        authenticator,
        ticketService: {
            listCreatorTickets(actor) {
                calls.push(actor);

                return {
                    tickets: [
                        {
                            ticketId: "ticket-1",
                            status: "OPEN",
                            createdAt:
                                "2026-07-26T12:00:00.000Z"
                        }
                    ]
                };
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        headers: {
            "x-actor-id": "attacker"
        },
        method: "GET",
        url:
            "/api/tickets?creatorId=attacker&actorId=attacker"
    });

    assert.strictEqual(response.statusCode, 404);
    assert.deepStrictEqual(calls, []);

    const validResponse =
        await harness.httpServer.request({
            headers: {
                "x-actor-id": "attacker"
            },
            method: "GET",
            url: "/api/tickets"
        });

    assert.strictEqual(validResponse.statusCode, 200);
    assert.deepStrictEqual(calls, [
        {
            actorId: "member-1",
            displayName: "Member",
            permissions: []
        }
    ]);
    assert.deepStrictEqual(
        JSON.parse(validResponse.body),
        {
            tickets: [
                {
                    ticketId: "ticket-1",
                    status: "OPEN",
                    createdAt:
                        "2026-07-26T12:00:00.000Z"
                }
            ]
        }
    );

    await harness.server.stop();

});

test("Ticket route returns an empty creator-owned list", async () => {

    const harness = createHarness({
        authenticator:
            new FakeWebsiteAuthenticator({
                identity: {
                    actorId: "member-1",
                    displayName: "Member",
                    permissions: []
                }
            }),
        ticketService: {
            listCreatorTickets() {
                return {
                    tickets: []
                };
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "GET",
        url: "/api/tickets"
    });

    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            tickets: []
        }
    );
    assert.strictEqual(
        response.headers["cache-control"],
        "no-store"
    );
    assert.strictEqual(
        response.headers["content-type"],
        "application/json; charset=utf-8"
    );
    assert.strictEqual(
        response.headers["x-content-type-options"],
        "nosniff"
    );

    await harness.server.stop();

});

test("Ticket route normalizes Ticket service failures", async () => {

    const harness = createHarness({
        authenticator:
            new FakeWebsiteAuthenticator({
                identity: {
                    actorId: "member-1",
                    displayName: "Member",
                    permissions: []
                }
            }),
        ticketService: {
            listCreatorTickets() {
                throw new Error(
                    "Sensitive Ticket database failure."
                );
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "GET",
        url: "/api/tickets"
    });

    assert.strictEqual(response.statusCode, 503);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Service unavailable."
        }
    );
    assert.strictEqual(
        response.body.includes("database"),
        false
    );

    await harness.server.stop();

});

test("health route does not invoke Ticket service", async () => {

    const calls = [];
    const harness = createHarness({
        ticketService: {
            listCreatorTickets(identity) {
                calls.push(identity);

                return {
                    tickets: []
                };
            }
        }
    });

    await harness.server.start(defaultOptions);

    const response = await harness.httpServer.request({
        method: "GET",
        url: "/health"
    });

    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(calls, []);

    await harness.server.stop();

});