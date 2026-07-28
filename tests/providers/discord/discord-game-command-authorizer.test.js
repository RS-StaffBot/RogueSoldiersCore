const assert = require("node:assert/strict");
const test = require("node:test");

const {
    PermissionFlagsBits
} = require("discord.js");

const DiscordGameCommandAuthorizer = require(
    "../../../src/providers/discord/services/DiscordGameCommandAuthorizer"
);

test("uses Manage Guild as the reusable game command requirement", () => {

    const authorizer = new DiscordGameCommandAuthorizer();

    assert.equal(
        authorizer.getRequiredPermission(),
        PermissionFlagsBits.ManageGuild
    );

});

test("authorizes members with the required Discord permission", () => {

    const authorizer = new DiscordGameCommandAuthorizer();
    const checked = [];
    const memberPermissions = {
        has(permission) {
            checked.push(permission);
            return true;
        }
    };

    assert.equal(
        authorizer.isAuthorized(memberPermissions),
        true
    );
    assert.deepEqual(checked, [PermissionFlagsBits.ManageGuild]);

});

test("rejects members without the required Discord permission", () => {

    const authorizer = new DiscordGameCommandAuthorizer();
    const memberPermissions = {
        has() {
            return false;
        }
    };

    assert.equal(
        authorizer.isAuthorized(memberPermissions),
        false
    );

});

test("rejects invalid permission check inputs", () => {

    const authorizer = new DiscordGameCommandAuthorizer();

    for (const value of [
        null,
        undefined,
        "permissions",
        {},
        { has: true }
    ]) {
        assert.throws(
            () => authorizer.isAuthorized(value),
            /Discord member permissions are required/
        );
    }

});

test("rejects an invalid configured Discord permission", () => {

    assert.throws(
        () => new DiscordGameCommandAuthorizer({
            requiredPermission: "ManageGuild"
        }),
        /permission must be a bigint/
    );

});
