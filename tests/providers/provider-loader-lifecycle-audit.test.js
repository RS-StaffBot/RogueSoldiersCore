const assert = require("node:assert/strict");
const test = require("node:test");

const ProviderLoader = require(
    "../../src/providers/core/ProviderLoader"
);

test("loads Discord when the optional Audit Module is unavailable", () => {

    const providers = ProviderLoader.load({
        configuration: {
            get(path, fallback) {
                if (path === "providers.website") {
                    return null;
                }

                if (path === "providers.sevendaystodie") {
                    return null;
                }

                return fallback;
            }
        },
        moduleManager: {
            get() {
                throw new Error("Module is not registered.");
            }
        },
        providerManager: {
            get() {
                return undefined;
            },
            getProviderStatus() {
                return null;
            },
            replaceProvider() {},
            restartProvider() {}
        }
    });

    assert.equal(providers.length, 1);
    assert.equal(providers[0].name, "Discord");
    assert.equal(providers[0].lifecycleAuditService, undefined);

});
