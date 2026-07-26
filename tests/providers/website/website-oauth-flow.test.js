const { createHash } = require("node:crypto");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const DiscordOAuthClient = require(
    "../../../src/providers/website/DiscordOAuthClient"
);
const InMemoryWebsiteOAuthStateStore = require(
    "../../../src/providers/website/InMemoryWebsiteOAuthStateStore"
);
const InMemoryWebsiteSessionStore = require(
    "../../../src/providers/website/InMemoryWebsiteSessionStore"
);
const WebsiteCookieService = require(
    "../../../src/providers/website/WebsiteCookieService"
);
const WebsiteOAuthFlow = require(
    "../../../src/providers/website/WebsiteOAuthFlow"
);
const FakeDiscordOAuthClient = require(
    "./fakes/FakeDiscordOAuthClient"
);

function createHarness({
    oauthClient = new FakeDiscordOAuthClient(),
    sessionStore = null,
    stateStore = null
} = {}) {

    let randomValue = 1;
    const cookieService =
        new WebsiteCookieService({
            oauthStateLifetimeMs: 600000,
            sessionAbsoluteLifetimeMs: 28800000
        });
    const resolvedStateStore =
        stateStore ??
        new InMemoryWebsiteOAuthStateStore({
            clock: () => 1000,
            lifetimeMs: 600000
        });
    const resolvedSessionStore =
        sessionStore ??
        new InMemoryWebsiteSessionStore({
            absoluteLifetimeMs: 28800000,
            clock: () => 1000,
            idleLifetimeMs: 1800000,
            randomBytesSource() {
                return Buffer.alloc(32, 90);
            }
        });
    const flow = new WebsiteOAuthFlow({
        cookieService,
        oauthClient,
        randomBytesSource() {
            const value = randomValue;

            randomValue += 1;

            return Buffer.alloc(32, value);
        },
        sessionStore: resolvedSessionStore,
        stateStore: resolvedStateStore
    });

    return {
        cookieService,
        flow,
        oauthClient,
        sessionStore: resolvedSessionStore,
        stateStore: resolvedStateStore
    };

}

function beginCallback(harness) {

    const login = harness.flow.beginLogin();
    const authorization =
        harness.oauthClient.authorizationCalls[0];
    const bindingCookie = login.cookies[0]
        .split(";", 1)[0];

    return {
        bindingCookie,
        code: "authorization-code",
        login,
        state: authorization.state
    };

}

test("creates a browser-bound S256 authorization attempt", () => {

    const harness = createHarness();
    const { login } = beginCallback(harness);
    const authorization =
        harness.oauthClient.authorizationCalls[0];
    const verifier = Buffer.alloc(32, 2)
        .toString("base64url");
    const expectedChallenge = createHash("sha256")
        .update(verifier, "ascii")
        .digest("base64url");

    assert.strictEqual(login.statusCode, 303);
    assert.match(
        login.location,
        /^https:\/\/discord\.com\/oauth2\/authorize/
    );
    assert.strictEqual(
        authorization.codeChallenge,
        expectedChallenge
    );
    assert.strictEqual(
        authorization.state,
        Buffer.alloc(32, 1).toString("base64url")
    );
    assert.match(
        login.cookies[0],
        /^__Secure-rsf_oauth_binding=/
    );
    assert.strictEqual(harness.stateStore.count(), 1);
    assert.strictEqual(
        login.location.includes("secret"),
        false
    );

});

test("fails login safely for capacity and shutdown", () => {

    const harness = createHarness({
        stateStore: {
            consume() {
                return null;
            },
            save() {
                throw new Error("capacity");
            }
        }
    });

    assert.strictEqual(
        harness.flow.beginLogin().statusCode,
        503
    );

    harness.flow.beginShutdown();

    assert.strictEqual(
        harness.flow.beginLogin().statusCode,
        503
    );

});

test("validates and consumes state before Discord access", async () => {

    const harness = createHarness();
    const callback = beginCallback(harness);
    const missingBinding =
        await harness.flow.completeCallback({
            callback: {
                code: callback.code,
                error: null,
                malformed: false,
                state: callback.state
            },
            request: {
                headers: {}
            }
        });

    assert.strictEqual(missingBinding.statusCode, 400);
    assert.strictEqual(
        harness.oauthClient.exchangeCalls.length,
        0
    );

    const mismatch =
        await harness.flow.completeCallback({
            callback: {
                code: callback.code,
                error: null,
                malformed: false,
                state: callback.state
            },
            request: {
                headers: {
                    cookie:
                        "__Secure-rsf_oauth_binding=" +
                        Buffer.alloc(32, 8)
                            .toString("base64url")
                }
            }
        });

    assert.strictEqual(mismatch.statusCode, 400);
    assert.strictEqual(
        harness.oauthClient.exchangeCalls.length,
        0
    );

    const denial =
        await harness.flow.completeCallback({
            callback: {
                code: null,
                error: "access_denied",
                malformed: false,
                state: callback.state
            },
            request: {
                headers: {
                    cookie: callback.bindingCookie
                }
            }
        });

    assert.strictEqual(denial.statusCode, 401);
    assert.strictEqual(
        harness.oauthClient.exchangeCalls.length,
        0
    );
    assert.match(
        denial.cookies[0],
        /^__Secure-rsf_oauth_binding=; Max-Age=0/
    );

    const replay =
        await harness.flow.completeCallback({
            callback: {
                code: callback.code,
                error: null,
                malformed: false,
                state: callback.state
            },
            request: {
                headers: {
                    cookie: callback.bindingCookie
                }
            }
        });

    assert.strictEqual(replay.statusCode, 400);

});

test("creates a session only after membership and revocation", async () => {

    const events = [];
    const oauthClient =
        new FakeDiscordOAuthClient({
            revokeGrant() {
                events.push("revoke");
            }
        });
    const createdIdentities = [];
    const revokedSessions = [];
    const sessionStore = {
        create(identity) {
            events.push("session");
            createdIdentities.push(identity);

            return {
                identity,
                token: Buffer.alloc(32, 5)
                    .toString("base64url")
            };
        },
        revoke(token) {
            revokedSessions.push(token);
        }
    };
    const harness = createHarness({
        oauthClient,
        sessionStore
    });
    const callback = beginCallback(harness);
    const oldSession = Buffer.alloc(32, 4)
        .toString("base64url");
    const result =
        await harness.flow.completeCallback({
            callback: {
                code: callback.code,
                error: null,
                malformed: false,
                state: callback.state
            },
            request: {
                headers: {
                    cookie:
                        `${callback.bindingCookie}; ` +
                        `__Host-rsf_session=${oldSession}`
                }
            }
        });

    assert.strictEqual(result.statusCode, 303);
    assert.strictEqual(result.location, "/api/me");
    assert.deepStrictEqual(events, [
        "revoke",
        "session"
    ]);
    assert.deepStrictEqual(
        revokedSessions,
        [oldSession]
    );
    assert.deepStrictEqual(createdIdentities[0], {
        actorId: "123456789012345678",
        displayName: "Rogue Soldier",
        permissions: []
    });
    assert.strictEqual(
        Object.isFrozen(createdIdentities[0]),
        true
    );
    assert.strictEqual(
        Object.isFrozen(
            createdIdentities[0].permissions
        ),
        true
    );
    assert.strictEqual(
        Object.hasOwn(
            createdIdentities[0],
            "discriminator"
        ),
        false
    );
    assert.strictEqual(
        JSON.stringify(result).includes("access-token"),
        false
    );

});

test("enforces user and guild membership policy", async t => {

    const cases = [
        {
            name: "bot",
            user: {
                bot: true,
                globalName: "Bot",
                id: "123",
                system: false,
                username: "bot"
            }
        },
        {
            name: "system user",
            user: {
                bot: false,
                globalName: "System",
                id: "123",
                system: true,
                username: "system"
            }
        },
        {
            member: {
                flags: 0,
                nick: "Pending",
                pending: true
            },
            name: "pending member"
        },
        {
            member: {
                flags: 1 << 4,
                nick: "Guest",
                pending: false
            },
            name: "guest member"
        }
    ];

    for (const item of cases) {
        await t.test(item.name, async () => {

            const oauthClient =
                new FakeDiscordOAuthClient({
                    fetchCurrentGuildMember() {
                        return item.member ?? {
                            flags: 0,
                            nick: "Member",
                            pending: false
                        };
                    },
                    fetchCurrentUser() {
                        return item.user ?? {
                            bot: false,
                            globalName: "Member",
                            id: "123",
                            system: false,
                            username: "member"
                        };
                    }
                });
            const harness = createHarness({
                oauthClient
            });
            const callback = beginCallback(harness);
            const result =
                await harness.flow.completeCallback({
                    callback: {
                        code: callback.code,
                        error: null,
                        malformed: false,
                        state: callback.state
                    },
                    request: {
                        headers: {
                            cookie:
                                callback.bindingCookie
                        }
                    }
                });

            assert.strictEqual(
                result.statusCode,
                403
            );
            assert.strictEqual(
                harness.sessionStore.count(),
                0
            );
            assert.deepStrictEqual(
                oauthClient.revokeCalls,
                ["access-token"]
            );

        });
    }

    await t.test(
        "missing membership",
        async () => {

            const oauthClient =
                new FakeDiscordOAuthClient({
                    fetchCurrentGuildMember() {
                        throw new DiscordOAuthClient
                            .RequestError(
                                "membership"
                            );
                    }
                });
            const harness = createHarness({
                oauthClient
            });
            const callback = beginCallback(harness);
            const result =
                await harness.flow.completeCallback({
                    callback: {
                        code: callback.code,
                        error: null,
                        malformed: false,
                        state: callback.state
                    },
                    request: {
                        headers: {
                            cookie:
                                callback.bindingCookie
                        }
                    }
                });

            assert.strictEqual(result.statusCode, 403);
            assert.deepStrictEqual(
                oauthClient.revokeCalls,
                ["access-token"]
            );

        }
    );

});

test("uses display-name fallbacks and blocks failed revocation", async t => {

    const names = [
        {
            expected: "Global",
            memberName: null,
            user: {
                globalName: "Global",
                username: "Username"
            }
        },
        {
            expected: "Username",
            memberName: null,
            user: {
                globalName: null,
                username: "Username"
            }
        }
    ];

    for (const item of names) {
        await t.test(item.expected, async () => {

            let createdIdentity;
            const oauthClient =
                new FakeDiscordOAuthClient({
                    fetchCurrentGuildMember() {
                        return {
                            flags: 0,
                            nick: item.memberName,
                            pending: false
                        };
                    },
                    fetchCurrentUser() {
                        return {
                            bot: false,
                            globalName:
                                item.user.globalName,
                            id: "123",
                            system: false,
                            username:
                                item.user.username
                        };
                    }
                });
            const harness = createHarness({
                oauthClient,
                sessionStore: {
                    create(identity) {
                        createdIdentity = identity;

                        return {
                            identity,
                            token: Buffer.alloc(32, 6)
                                .toString("base64url")
                        };
                    },
                    revoke() {}
                }
            });
            const callback = beginCallback(harness);

            await harness.flow.completeCallback({
                callback: {
                    code: callback.code,
                    error: null,
                    malformed: false,
                    state: callback.state
                },
                request: {
                    headers: {
                        cookie: callback.bindingCookie
                    }
                }
            });

            assert.strictEqual(
                createdIdentity.displayName,
                item.expected
            );

        });
    }

    await t.test(
        "revocation failure",
        async () => {

            let sessionCreated = false;
            const oauthClient =
                new FakeDiscordOAuthClient({
                    revokeGrant() {
                        throw new Error(
                            "revocation failed"
                        );
                    }
                });
            const harness = createHarness({
                oauthClient,
                sessionStore: {
                    create() {
                        sessionCreated = true;
                    },
                    revoke() {}
                }
            });
            const callback = beginCallback(harness);
            const result =
                await harness.flow.completeCallback({
                    callback: {
                        code: callback.code,
                        error: null,
                        malformed: false,
                        state: callback.state
                    },
                    request: {
                        headers: {
                            cookie:
                                callback.bindingCookie
                        }
                    }
                });

            assert.strictEqual(result.statusCode, 503);
            assert.strictEqual(sessionCreated, false);

        }
    );

});

test("logout requires exact Origin and is idempotent", () => {

    const revoked = [];
    const harness = createHarness({
        sessionStore: {
            create() {},
            revoke(token) {
                revoked.push(token);
            }
        }
    });
    const session = Buffer.alloc(32, 7)
        .toString("base64url");
    const request = {
        headers: {
            cookie: `__Host-rsf_session=${session}`,
            origin: "https://community.example"
        }
    };

    assert.strictEqual(
        harness.flow.logout(
            {
                headers: {
                    ...request.headers,
                    origin: "https://wrong.example"
                }
            },
            "https://community.example"
        ).statusCode,
        403
    );
    assert.deepStrictEqual(revoked, []);

    const result = harness.flow.logout(
        request,
        "https://community.example"
    );

    assert.strictEqual(result.statusCode, 204);
    assert.deepStrictEqual(revoked, [session]);
    assert.strictEqual(result.cookies.length, 2);

});
