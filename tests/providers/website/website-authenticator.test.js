const { test } = require("node:test");
const assert = require("node:assert/strict");

const WebsiteAuthenticator = require(
    "../../../src/providers/website/WebsiteAuthenticator"
);

test("denies production authentication by default", async () => {

    const authenticator = new WebsiteAuthenticator();

    assert.deepStrictEqual(
        await authenticator.authenticate(),
        {
            clearSessionCookie: false,
            identity: null
        }
    );

});

test("does not trust request data into an identity", async () => {

    const authenticator = new WebsiteAuthenticator();
    const request = {
        actorId: "untrusted-actor",
        authorization: "untrusted-credential",
        displayName: "Untrusted",
        permissions: ["tickets.administrate"]
    };

    assert.deepStrictEqual(
        await authenticator.authenticate(request),
        {
            clearSessionCookie: false,
            identity: null
        }
    );

});

test("supports safe repeated await-compatible calls", async () => {

    const authenticator = new WebsiteAuthenticator();
    const request = {
        headers: {}
    };

    const results = await Promise.all([
        authenticator.authenticate(request),
        authenticator.authenticate(request),
        authenticator.authenticate(request)
    ]);

    assert.deepStrictEqual(
        results,
        [
            {
                clearSessionCookie: false,
                identity: null
            },
            {
                clearSessionCookie: false,
                identity: null
            },
            {
                clearSessionCookie: false,
                identity: null
            }
        ]
    );

});

test("authenticates and refreshes a valid session", async () => {

    const identity = Object.freeze({
        actorId: "123",
        displayName: "Member",
        permissions: Object.freeze([])
    });
    const resolvedTokens = [];
    const authenticator = new WebsiteAuthenticator({
        cookieService: {
            readSessionCookie() {
                return {
                    present: true,
                    token: "valid-token",
                    valid: true
                };
            }
        },
        sessionStore: {
            resolve(token) {
                resolvedTokens.push(token);

                return identity;
            }
        }
    });

    const result = await authenticator.authenticate({
        headers: {}
    });

    assert.deepStrictEqual(result, {
        clearSessionCookie: false,
        identity
    });
    assert.deepStrictEqual(
        resolvedTokens,
        ["valid-token"]
    );
    assert.strictEqual(
        Object.hasOwn(result, "token"),
        false
    );

});

test("distinguishes missing and invalid supplied sessions", async () => {

    const cases = [
        {
            cookie: {
                present: false,
                token: null,
                valid: true
            },
            expectedClear: false
        },
        {
            cookie: {
                present: true,
                token: null,
                valid: false
            },
            expectedClear: true
        },
        {
            cookie: {
                present: true,
                token: "unknown-token",
                valid: true
            },
            expectedClear: true
        }
    ];

    for (const item of cases) {

        const authenticator =
            new WebsiteAuthenticator({
                cookieService: {
                    readSessionCookie() {
                        return item.cookie;
                    }
                },
                sessionStore: {
                    resolve() {
                        return null;
                    }
                }
            });

        assert.deepStrictEqual(
            await authenticator.authenticate({}),
            {
                clearSessionCookie:
                    item.expectedClear,
                identity: null
            }
        );

    }

});

test("propagates session-store failures", async () => {

    const failure = new Error(
        "Session store failed."
    );
    const authenticator = new WebsiteAuthenticator({
        cookieService: {
            readSessionCookie() {
                return {
                    present: true,
                    token: "valid-token",
                    valid: true
                };
            }
        },
        sessionStore: {
            resolve() {
                throw failure;
            }
        }
    });

    await assert.rejects(
        authenticator.authenticate({}),
        error => error === failure
    );

});
