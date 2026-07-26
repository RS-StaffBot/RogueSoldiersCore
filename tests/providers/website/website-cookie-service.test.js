const { test } = require("node:test");
const assert = require("node:assert/strict");

const WebsiteCookieService = require(
    "../../../src/providers/website/WebsiteCookieService"
);

const token = "a".repeat(43);

function createService() {
    return new WebsiteCookieService({
        oauthStateLifetimeMs: 600999,
        sessionAbsoluteLifetimeMs: 28800999
    });
}

test("creates exact protected session cookies", () => {

    const service = createService();

    assert.strictEqual(
        service.createSessionCookie(token),
        "__Host-rsf_session=" + token +
        "; Max-Age=28800; Path=/; Secure; HttpOnly; " +
        "SameSite=Lax"
    );
    assert.strictEqual(
        service.clearSessionCookie(),
        "__Host-rsf_session=; Max-Age=0; Path=/; " +
        "Secure; HttpOnly; SameSite=Lax"
    );
    assert.strictEqual(
        service.createSessionCookie(token)
            .includes("Domain="),
        false
    );

});

test("creates exact protected OAuth binding cookies", () => {

    const service = createService();

    assert.strictEqual(
        service.createOAuthBindingCookie(token),
        "__Secure-rsf_oauth_binding=" + token +
        "; Max-Age=600; Path=/auth/discord/callback; " +
        "Secure; HttpOnly; SameSite=Lax"
    );
    assert.strictEqual(
        service.clearOAuthBindingCookie(),
        "__Secure-rsf_oauth_binding=; Max-Age=0; " +
        "Path=/auth/discord/callback; Secure; HttpOnly; " +
        "SameSite=Lax"
    );

});

test("reads valid session and binding cookies", () => {

    const service = createService();
    const request = {
        headers: {
            cookie:
                `other=value; __Host-rsf_session=${token}; ` +
                `__Secure-rsf_oauth_binding=${token}`
        }
    };

    assert.deepStrictEqual(
        service.readSessionCookie(request),
        {
            present: true,
            token,
            valid: true
        }
    );
    assert.deepStrictEqual(
        service.readOAuthBindingCookie(request),
        {
            present: true,
            token,
            valid: true
        }
    );

});

test("reports missing cookies without clearing", () => {

    const service = createService();

    assert.deepStrictEqual(
        service.readSessionCookie({
            headers: {}
        }),
        {
            present: false,
            token: null,
            valid: true
        }
    );

});

test("fails safely for duplicate and malformed target cookies", () => {

    const service = createService();

    for (const cookie of [
        `__Host-rsf_session=${token}; ` +
            `__Host-rsf_session=${token}`,
        "__Host-rsf_session=bad token",
        ["invalid"]
    ]) {

        assert.deepStrictEqual(
            service.readSessionCookie({
                headers: {
                    cookie
                }
            }),
            {
                present: true,
                token: null,
                valid: false
            }
        );

    }

});
