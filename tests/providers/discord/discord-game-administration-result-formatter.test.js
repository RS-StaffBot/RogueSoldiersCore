const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordGameAdministrationResultFormatter = require(
    "../../../src/providers/discord/services/" +
    "DiscordGameAdministrationResultFormatter"
);

const TEST_USER_ID = "EOS_0002c60901644d5dbbe98aa9575f6d65";

function assertDoesNotExposePrivateData(result) {
    assert.equal(result.message.includes(TEST_USER_ID), false);
    assert.equal(result.message.includes("192.0.2.10"), false);
    assert.equal(result.message.includes("serveradmin.xml"), false);
    assert.equal(Object.isFrozen(result), true);
}

test("formats verified kick success without raw output", () => {
    const formatter = new DiscordGameAdministrationResultFormatter();
    const result = formatter.formatKick({
        responseLines: [
            "2026-07-29 INF Executing command 'kick 171' by Telnet",
            "Kicking Player TestPlayer: RSF evidence test",
            "private-ip=192.0.2.10"
        ]
    });

    assert.deepEqual(result, {
        message: "Kicked TestPlayer from the game server.",
        outcome: "KICKED",
        success: true
    });
    assert.equal(result.message.includes("192.0.2.10"), false);
    assert.equal(Object.isFrozen(result), true);
});

test("formats invalid or offline kick targets safely", () => {
    const formatter = new DiscordGameAdministrationResultFormatter();
    const result = formatter.formatKick({
        responseLines: [
            "\"171\" is not a valid entity id, player name or user id."
        ]
    });

    assert.deepEqual(result, {
        message: "That player is no longer online or could not be found.",
        outcome: "PLAYER_NOT_FOUND",
        success: false
    });
});

test("fails safely for malformed or unrecognized results", () => {
    const formatter = new DiscordGameAdministrationResultFormatter();

    for (const value of [
        null,
        {},
        { responseLines: null },
        { responseLines: ["private Telnet stack trace"] }
    ]) {
        const result = formatter.formatKick(value);

        assert.equal(result.success, false);
        assert.equal(result.outcome, "INVALID_RESPONSE");
        assert.equal(result.message.includes("private Telnet"), false);
        assert.equal(Object.isFrozen(result), true);
    }
});

test("does not mistake disconnect cleanup for kick success", () => {
    const formatter = new DiscordGameAdministrationResultFormatter();
    const result = formatter.formatKick({
        responseLines: [
            "INF PlayerDisconnected EntityID=171",
            "WRN DisconnectClient: Player not found",
            "UnityEngine.StackTraceUtility:ExtractStackTrace ()"
        ]
    });

    assert.deepEqual(result, {
        message: "The game server returned an unrecognized kick response.",
        outcome: "INVALID_RESPONSE",
        success: false
    });
});

test("formats whitelist add success without exposing the platform ID", () => {
    const formatter = new DiscordGameAdministrationResultFormatter();
    const result = formatter.formatWhitelistAdd({
        responseLines: [
            `${TEST_USER_ID} added to whitelist.`,
            "Whitelist only mode has been ACTIVATED!",
            "2026-07-30 INF Reloading serveradmin.xml",
            "private-ip=192.0.2.10"
        ]
    }, "RubbaDuckie");

    assert.deepEqual(result, {
        message: "Added RubbaDuckie to the game server whitelist.",
        outcome: "WHITELISTED",
        success: true
    });
    assertDoesNotExposePrivateData(result);
});

test("formats whitelist remove success without exposing the platform ID", () => {
    const formatter = new DiscordGameAdministrationResultFormatter();
    const result = formatter.formatWhitelistRemove({
        responseLines: [
            "Whitelist only mode has been DISABLED!",
            `${TEST_USER_ID} removed from the whitelist.`,
            "2026-07-30 INF Reloading serveradmin.xml",
            "private-ip=192.0.2.10"
        ]
    }, "RubbaDuckie");

    assert.deepEqual(result, {
        message: "Removed RubbaDuckie from the game server whitelist.",
        outcome: "REMOVED_FROM_WHITELIST",
        success: true
    });
    assertDoesNotExposePrivateData(result);
});

test("formats missing whitelist removal safely", () => {
    const formatter = new DiscordGameAdministrationResultFormatter();
    const result = formatter.formatWhitelistRemove({
        responseLines: [
            `${TEST_USER_ID} was not on the whitelist.`,
            "private-ip=192.0.2.10"
        ]
    }, "RubbaDuckie");

    assert.deepEqual(result, {
        message: "RubbaDuckie is not on the game server whitelist.",
        outcome: "NOT_WHITELISTED",
        success: false
    });
    assertDoesNotExposePrivateData(result);
});

test("fails safely for malformed whitelist responses", () => {
    const formatter = new DiscordGameAdministrationResultFormatter();

    for (const value of [
        null,
        {},
        { responseLines: null },
        {
            responseLines: [
                "Whitelist only mode has been ACTIVATED!",
                "2026-07-30 INF Reloading serveradmin.xml",
                "private-ip=192.0.2.10"
            ]
        }
    ]) {
        const addResult = formatter.formatWhitelistAdd(value, "RubbaDuckie");
        const removeResult = formatter.formatWhitelistRemove(
            value,
            "RubbaDuckie"
        );

        assert.equal(addResult.success, false);
        assert.equal(addResult.outcome, "INVALID_RESPONSE");
        assertDoesNotExposePrivateData(addResult);
        assert.equal(removeResult.success, false);
        assert.equal(removeResult.outcome, "INVALID_RESPONSE");
        assertDoesNotExposePrivateData(removeResult);
    }
});
