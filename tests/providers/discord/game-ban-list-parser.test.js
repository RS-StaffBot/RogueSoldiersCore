const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordGameBanListParser = require(
    "../../../src/providers/discord/services/DiscordGameBanListParser"
);

function createResult(lines) {
    return { responseLines: lines };
}

test("parses verified Steam and EOS ban rows", () => {
    const parser = new DiscordGameBanListParser();
    const list = parser.parse(createResult([
        "2026-07-29 INF Executing command 'ban list' by Telnet",
        "Ban list entries:",
        "  Banned until - UserID (name) - Reason",
        "  2026-07-29 22:31:50 - Steam_76561198324839127 " +
        "(FirstPlayer) - First reason",
        "  2026-07-30 22:31:50 - EOS_0002c60901644d5dbbe98aa9575f6d65 " +
        "(SecondPlayer) - Second reason"
    ]));

    assert.deepEqual(list.entries, [
        {
            displayName: "FirstPlayer",
            reason: "First reason",
            userId: "Steam_76561198324839127"
        },
        {
            displayName: "SecondPlayer",
            reason: "Second reason",
            userId: "EOS_0002c60901644d5dbbe98aa9575f6d65"
        }
    ]);
    assert.equal(Object.isFrozen(list), true);
    assert.equal(Object.isFrozen(list.entries), true);
});

test("accepts a verified empty ban list", () => {
    const parser = new DiscordGameBanListParser();
    const list = parser.parse(createResult([
        "Ban list entries:",
        "  Banned until - UserID (name) - Reason"
    ]));

    assert.deepEqual(list.entries, []);
});

test("rejects missing headers and malformed rows", () => {
    const parser = new DiscordGameBanListParser();

    assert.equal(parser.parse(null), null);
    assert.equal(parser.parse(createResult(["Ban list entries:"])), null);
    assert.equal(parser.parse(createResult([
        "Ban list entries:",
        "  Banned until - UserID (name) - Reason",
        "private malformed output"
    ])), null);
});

test("resolves only one exact display name", () => {
    const parser = new DiscordGameBanListParser();
    const unique = {
        entries: [{ displayName: "Player", userId: "Steam_1" }]
    };
    const duplicate = {
        entries: [
            { displayName: "Player", userId: "Steam_1" },
            { displayName: "Player", userId: "Steam_2" }
        ]
    };

    assert.equal(
        parser.findUniqueByDisplayName(unique, "Player").status,
        "FOUND"
    );
    assert.equal(
        parser.findUniqueByDisplayName(unique, "player").status,
        "NOT_FOUND"
    );
    assert.equal(
        parser.findUniqueByDisplayName(duplicate, "Player").status,
        "AMBIGUOUS"
    );
});

test("checks the exact stored UserID", () => {
    const parser = new DiscordGameBanListParser();
    const list = {
        entries: [{
            displayName: "Player",
            userId: "EOS_0002c60901644d5dbbe98aa9575f6d65"
        }]
    };

    assert.equal(
        parser.containsUserId(
            list,
            "EOS_0002c60901644d5dbbe98aa9575f6d65"
        ),
        true
    );
    assert.equal(parser.containsUserId(list, "Steam_1"), false);
});
