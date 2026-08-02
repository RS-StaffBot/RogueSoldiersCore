const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordProvider = require(
    "../../../src/providers/discord/DiscordProvider"
);

function createClient() {
    return {
        once() {},
        on() {},
        removeListener() {}
    };
}

function createRegistry() {
    const commands = [];

    return {
        commands,
        clear() {
            commands.length = 0;
        },
        getAll() {
            return [...commands];
        },
        register(command) {
            commands.push(command);
        }
    };
}

function createLogger() {
    return {
        error() {},
        info() {}
    };
}

test("passes the narrow Audit dependencies to CommandLoader", () => {

    const received = [];
    const auditAuthorizer = Object.freeze({
        getRequiredPermission: () => 32n,
        isAuthorized: () => true
    });
    const auditQueryBoundary = Object.freeze({
        getById() {
            return null;
        },
        list() {
            return Object.freeze({
                records: Object.freeze([]),
                nextCursor: null
            });
        }
    });
    const logger = createLogger();
    const registry = createRegistry();

    const provider = new DiscordProvider({
        auditAuthorizer,
        auditQueryBoundary,
        commandLoader: {
            load(options) {
                received.push(options);
                return [];
            }
        },
        commandRegistry: registry,
        createClient,
        interactionHandler: {
            register() {}
        },
        logger
    });

    provider.initialize();

    assert.equal(received.length, 1);
    assert.equal(
        received[0].auditAuthorizer,
        auditAuthorizer
    );
    assert.equal(
        received[0].auditQueryBoundary,
        auditQueryBoundary
    );
    assert.equal(received[0].logger, logger);

});

test("does not invent an Audit command when boundary is unavailable", () => {

    const received = [];
    const provider = new DiscordProvider({
        commandLoader: {
            load(options) {
                received.push(options);
                return [];
            }
        },
        commandRegistry: createRegistry(),
        createClient,
        interactionHandler: {
            register() {}
        },
        logger: createLogger()
    });

    provider.initialize();

    assert.equal(received.length, 1);
    assert.equal(
        received[0].auditQueryBoundary,
        undefined
    );

});
