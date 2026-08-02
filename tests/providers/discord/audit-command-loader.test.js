const assert = require("node:assert/strict");
const test = require("node:test");

const CommandLoader = require(
    "../../../src/providers/discord/commands/CommandLoader"
);

function createAuthorizer() {
    return {
        getRequiredPermission: () => 32n,
        isAuthorized: () => true
    };
}

function createGameResolver() {
    return {
        resolve() {
            return null;
        }
    };
}

function createLogger() {
    return {
        error() {}
    };
}

test("omits Audit command when its query boundary is unavailable", () => {

    const commands = CommandLoader.load({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createGameResolver(),
        logger: createLogger()
    });

    assert.equal(
        commands.some(command => command.data.name === "audit"),
        false
    );

});

test("loads Audit command with only its approved dependencies", () => {

    const auditAuthorizer = createAuthorizer();
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

    const commands = CommandLoader.load({
        auditAuthorizer,
        auditQueryBoundary,
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createGameResolver(),
        logger
    });

    const command = commands.find(
        candidate => candidate.data.name === "audit"
    );

    assert.notEqual(command, undefined);
    assert.equal(command.authorizer, auditAuthorizer);
    assert.equal(
        command.queryBoundary,
        auditQueryBoundary
    );
    assert.equal(command.logger, logger);

});

test("Audit command boundary exposes no Module or store internals", () => {

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

    const commands = CommandLoader.load({
        auditAuthorizer: createAuthorizer(),
        auditQueryBoundary,
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createGameResolver(),
        logger: createLogger()
    });

    const command = commands.find(
        candidate => candidate.data.name === "audit"
    );

    assert.deepEqual(
        Object.keys(command.queryBoundary).sort(),
        ["getById", "list"]
    );
    assert.equal(
        Object.isFrozen(command.queryBoundary),
        true
    );
    assert.equal(
        command.queryBoundary.auditModule,
        undefined
    );
    assert.equal(
        command.queryBoundary.store,
        undefined
    );
    assert.equal(
        command.queryBoundary.database,
        undefined
    );
    assert.equal(
        command.queryBoundary.queryService,
        undefined
    );

});
