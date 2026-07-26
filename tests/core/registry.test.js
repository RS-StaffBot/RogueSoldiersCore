const {
    after,
    beforeEach,
    test
} = require("node:test");
const assert = require("node:assert/strict");

const Registry = require("../../src/core/Registry");

beforeEach(() => {
    Registry.services.clear();
});

after(() => {
    Registry.services.clear();
});

test("registers and retrieves a service", () => {

    const service = {
        name: "Example"
    };

    Registry.register("example", service);

    assert.strictEqual(
        Registry.get("example"),
        service
    );
    assert.strictEqual(Registry.has("example"), true);
    assert.deepStrictEqual(Registry.list(), ["example"]);

});

test("rejects duplicate service names", () => {

    Registry.register("example", {});

    assert.throws(
        () => Registry.register("example", {}),
        {
            message: "Service 'example' is already registered."
        }
    );

});

test("rejects unknown service names", () => {

    assert.throws(
        () => Registry.get("missing"),
        {
            message: "Service 'missing' is not registered."
        }
    );

});
