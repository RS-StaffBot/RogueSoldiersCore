const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordGamePlayerTargetValidator = require(
    "../../../src/providers/discord/services/" +
    "DiscordGamePlayerTargetValidator"
);

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
        const result = validator.validateOnlineEntityId(value);

        assert.equal(result.valid, false);
        assert.equal(result.value, null);
        assert.equal(typeof result.message, "string");
        assert.equal(Object.isFrozen(result), true);
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

        assert.equal(result.valid, false);
        assert.equal(result.value, null);
        assert.match(result.message, /reason must be 1-200 characters/u);
        assert.equal(Object.isFrozen(result), true);
    }
});
