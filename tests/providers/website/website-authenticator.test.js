const { test } = require("node:test");
const assert = require("node:assert/strict");

const WebsiteAuthenticator = require(
    "../../../src/providers/website/WebsiteAuthenticator"
);

test("denies production authentication by default", async () => {

    const authenticator = new WebsiteAuthenticator();

    assert.strictEqual(
        await authenticator.authenticate(),
        null
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

    assert.strictEqual(
        await authenticator.authenticate(request),
        null
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
        [null, null, null]
    );

});
