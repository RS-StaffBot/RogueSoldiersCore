const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordPermissionAuthorizer = require(
    "../../../src/providers/discord/services/DiscordPermissionAuthorizer"
);

test("requires one fixed Discord permission", () => {

    assert.throws(
        () => new DiscordPermissionAuthorizer(),
        /required permission must be a bigint/u
    );

    assert.throws(
        () => new DiscordPermissionAuthorizer({
            requiredPermission: "32"
        }),
        /required permission must be a bigint/u
    );

});

test("returns an immutable fixed permission for registration", () => {

    const authorizer = new DiscordPermissionAuthorizer({
        requiredPermission: 32n
    });

    assert.equal(
        authorizer.getRequiredPermission(),
        32n
    );
    assert.equal(Object.isFrozen(authorizer), true);

    assert.throws(
        () => {
            "use strict";
            authorizer.requiredPermission = 64n;
        },
        TypeError
    );

    assert.equal(
        authorizer.getRequiredPermission(),
        32n
    );

});

test("authorizes resolved Discord member permissions", () => {

    const checked = [];
    const authorizer = new DiscordPermissionAuthorizer({
        requiredPermission: 32n
    });

    const authorized = authorizer.isAuthorized({
        has(permission) {
            checked.push(permission);
            return true;
        }
    });

    assert.equal(authorized, true);
    assert.deepEqual(checked, [32n]);

});

test("denies when the required permission is absent", () => {

    const authorizer = new DiscordPermissionAuthorizer({
        requiredPermission: 32n
    });

    assert.equal(
        authorizer.isAuthorized({
            has() {
                return false;
            }
        }),
        false
    );

});

test("rejects an invalid member-permission boundary", () => {

    const authorizer = new DiscordPermissionAuthorizer({
        requiredPermission: 32n
    });

    assert.throws(
        () => authorizer.isAuthorized(null),
        /member permissions are required/u
    );

    assert.throws(
        () => authorizer.isAuthorized({}),
        /member permissions are required/u
    );

});