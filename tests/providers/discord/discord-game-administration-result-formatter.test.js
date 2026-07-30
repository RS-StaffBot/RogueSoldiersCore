const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordGameAdministrationResultFormatter = require(
    "../../../src/providers/discord/services/" +
    "DiscordGameAdministrationResultFormatter"
);

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
