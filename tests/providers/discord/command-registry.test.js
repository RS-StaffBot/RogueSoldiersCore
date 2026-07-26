const {
    after,
    beforeEach,
    test
} = require("node:test");
const assert = require("node:assert/strict");

const CommandRegistry = require(
    "../../../src/providers/discord/services/CommandRegistry"
);

beforeEach(() => {
    CommandRegistry.clear();
});

after(() => {
    CommandRegistry.clear();
});

function createCommand(name) {

    return {
        data: {
            name,
            toJSON() {
                return {
                    name,
                    description: `${name} command`
                };
            }
        },
        execute() {
            return name;
        }
    };

}

test("registers a valid command", () => {

    const command = createCommand("example");

    CommandRegistry.register(command);

    assert.strictEqual(
        CommandRegistry.has("example"),
        true
    );
    assert.strictEqual(
        CommandRegistry.get("example"),
        command
    );

});

test("rejects invalid command structures", () => {

    const invalidCommands = [
        null,
        {},
        {
            data: {
                name: "",
                toJSON() {
                    return {};
                }
            },
            execute() {}
        },
        {
            data: {
                name: "missing-serialization"
            },
            execute() {}
        },
        {
            data: {
                name: "missing-execution",
                toJSON() {
                    return {};
                }
            }
        }
    ];

    for (const command of invalidCommands) {
        assert.throws(
            () => CommandRegistry.register(command),
            TypeError
        );
    }

    assert.deepStrictEqual(
        CommandRegistry.getAll(),
        []
    );

});

test("rejects duplicate command names", () => {

    CommandRegistry.register(createCommand("duplicate"));

    assert.throws(
        () => CommandRegistry.register(
            createCommand("duplicate")
        ),
        {
            message:
                "Discord command 'duplicate' is already registered."
        }
    );

});

test("retrieves and lists registered commands", () => {

    const firstCommand = createCommand("first");
    const secondCommand = createCommand("second");

    CommandRegistry.register(firstCommand);
    CommandRegistry.register(secondCommand);

    assert.strictEqual(
        CommandRegistry.get("first"),
        firstCommand
    );
    assert.deepStrictEqual(
        CommandRegistry.getAll(),
        [firstCommand, secondCommand]
    );

});

test("produces serialized command definitions", () => {

    CommandRegistry.register(createCommand("first"));
    CommandRegistry.register(createCommand("second"));

    assert.deepStrictEqual(
        CommandRegistry.getDefinitions(),
        [
            {
                name: "first",
                description: "first command"
            },
            {
                name: "second",
                description: "second command"
            }
        ]
    );

});
