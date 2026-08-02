const assert = require("node:assert/strict");
const test = require("node:test");

const ProviderLoader = require(
    "../../src/providers/core/ProviderLoader"
);

function createConfiguration() {
    return {
        get(path, defaultValue = null) {

            if (
                path === "providers.sevendaystodie" ||
                path === "providers.website"
            ) {
                return defaultValue;
            }

            assert.fail(
                `Unexpected configuration path: ${path}`
            );

        }
    };
}

function createProviderManager() {
    return {
        get() {
            return undefined;
        }
    };
}

function createAuditModule({
    getRecord = () => null,
    queryRecords = () => []
} = {}) {

    return {
        getRecord,
        queryRecords,
        recordAction() {
            return Object.freeze({
                id: "audit-1"
            });
        }
    };

}

test("constructs a frozen narrow Audit query boundary", () => {

    const auditRecord = Object.freeze({
        id: "audit-12"
    });
    const requestedNames = [];
    const auditModule = createAuditModule({
        getRecord(id) {
            assert.equal(id, "audit-12");

            return auditRecord;
        },
        queryRecords({
            beforeSequence,
            filters,
            limit
        }) {
            assert.equal(beforeSequence, null);
            assert.equal(limit, 6);
            assert.equal(Object.isFrozen(filters), true);

            return Object.freeze([
                auditRecord
            ]);
        }
    });
    const moduleManager = {
        get(name) {
            requestedNames.push(name);

            if (name === "Audit") {
                return auditModule;
            }

            return undefined;
        }
    };

    const providers = ProviderLoader.load({
        configuration: createConfiguration(),
        moduleManager,
        providerManager: createProviderManager()
    });
    const discordProvider = providers[0];
    const boundary = discordProvider.auditQueryBoundary;

    assert.deepEqual(requestedNames, ["Audit"]);
    assert.notEqual(boundary, undefined);
    assert.equal(Object.isFrozen(boundary), true);
    assert.deepEqual(
        Object.keys(boundary).sort(),
        ["getById", "list"]
    );

    assert.equal(
        boundary.getById("audit-12"),
        auditRecord
    );

    const result = boundary.list({
        limit: 5
    });

    assert.deepEqual(result.records, [
        auditRecord
    ]);
    assert.equal(result.nextCursor, null);

});

test("does not expose Audit Module or storage internals", () => {

    const auditModule = createAuditModule();
    const providers = ProviderLoader.load({
        configuration: createConfiguration(),
        moduleManager: {
            get(name) {
                return name === "Audit"
                    ? auditModule
                    : undefined;
            }
        },
        providerManager: createProviderManager()
    });
    const boundary =
        providers[0].auditQueryBoundary;

    assert.equal(boundary.auditModule, undefined);
    assert.equal(boundary.store, undefined);
    assert.equal(boundary.database, undefined);
    assert.equal(boundary.queryService, undefined);
    assert.equal(boundary.sqlite, undefined);

});

test("omits the lookup boundary when Audit is unavailable", () => {

    const providers = ProviderLoader.load({
        configuration: createConfiguration(),
        moduleManager: {
            get() {
                throw new Error(
                    "Audit Module is unavailable."
                );
            }
        },
        providerManager: createProviderManager()
    });

    assert.equal(
        providers[0].auditQueryBoundary,
        undefined
    );

});

test("omits the lookup boundary for an invalid Audit contract", () => {

    const providers = ProviderLoader.load({
        configuration: createConfiguration(),
        moduleManager: {
            get() {
                return {
                    recordAction() {}
                };
            }
        },
        providerManager: createProviderManager()
    });

    assert.equal(
        providers[0].auditQueryBoundary,
        undefined
    );

});

test("normalizes Audit query failures through the service", () => {

    const providers = ProviderLoader.load({
        configuration: createConfiguration(),
        moduleManager: {
            get() {
                return createAuditModule({
                    getRecord() {
                        throw new Error(
                            "SQL database path password"
                        );
                    },
                    queryRecords() {
                        throw new Error(
                            "SQL database path password"
                        );
                    }
                });
            }
        },
        providerManager: createProviderManager()
    });
    const boundary =
        providers[0].auditQueryBoundary;

    assert.throws(
        () => boundary.getById("audit-1"),
        {
            message: "Audit query failed."
        }
    );

    assert.throws(
        () => boundary.list(),
        {
            message: "Audit query failed."
        }
    );

});
