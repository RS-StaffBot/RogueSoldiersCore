const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordGamePlayerTargetValidator = require(
    "../../../src/providers/discord/services/" +
    "DiscordGamePlayerTargetValidator"
);

function assertInvalid(result) {
    assert.equal(result.valid, false);
    assert.equal(result.value, null);
    assert.equal(typeof result.message, "string");
    assert.equal(Object.isFrozen(result), true);
}

test("accepts positive safe online entity IDs", () => {
    const validator = new DiscordGamePlayerTargetValidator();

    assert.deepEqual(validator.validateOnlineEntityId("171"), {
        valid: true,
        value: 171
    });
});

test("rejects malformed and unsafe entity IDs", () => {
    const validator = new DiscordGamePlayerTargetValidator();
    const invalidValues = [
        null,
        "",
        "0",
        "-1",
        "1.5",
        "171 ",
        "171\nkick 2",
        "Steam_76561198324839127",
        "9007199254740992"
    ];

    for (const value of invalidValues) {
        assertInvalid(validator.validateOnlineEntityId(value));
    }
});

test("accepts durable Steam and EOS user IDs", () => {
    const validator = new DiscordGamePlayerTargetValidator();

    for (const value of [
        "Steam_76561198324839127",
        "EOS_0002c60901644d5dbbe98aa9575f6d65"
    ]) {
        const result = validator.validateDurableUserId(value);

        assert.deepEqual(result, {
            valid: true,
            value
        });
        assert.equal(Object.isFrozen(result), true);
    }
});

test("rejects malformed or command-shaped durable user IDs", () => {
    const validator = new DiscordGamePlayerTargetValidator();

    for (const value of [
        null,
        "",
        "Steam_0",
        "Steam_76561198324839127 ",
        "EOS_short",
        "EOS_0002c60901644d5dbbe98aa9575f6d65\nwhitelist list",
        "76561198324839127"
    ]) {
        assertInvalid(validator.validateDurableUserId(value));
    }
});

test("accepts bounded display names", () => {
    const validator = new DiscordGamePlayerTargetValidator();

    const result = validator.validateDisplayName("RubbaDuckie");

    assert.deepEqual(result, {
        valid: true,
        value: "RubbaDuckie"
    });
    assert.equal(Object.isFrozen(result), true);
});

test("rejects malformed or command-shaped display names", () => {
    const validator = new DiscordGamePlayerTargetValidator();

    for (const value of [
        null,
        "",
        " leading",
        "trailing ",
        "contains \"quotes\"",
        "contains\\backslash",
        "line\nbreak",
        "a".repeat(41)
    ]) {
        assertInvalid(validator.validateDisplayName(value));
    }
});

test("accepts bounded kick reasons", () => {
    const validator = new DiscordGamePlayerTargetValidator();

    assert.deepEqual(
        validator.validateReason("Repeated griefing after staff warning"),
        {
            valid: true,
            value: "Repeated griefing after staff warning"
        }
    );
});

test("rejects command-shaping and malformed kick reasons", () => {
    const validator = new DiscordGamePlayerTargetValidator();
    const invalidValues = [
        null,
        "",
        " leading",
        "trailing ",
        "contains \"quotes\"",
        "contains\\backslash",
        "line\nbreak",
        "a".repeat(201)
    ];

    for (const value of invalidValues) {
        const result = validator.validateReason(value);

        assertInvalid(result);
        assert.match(result.message, /reason must be 1-200 characters/u);
    }
});
