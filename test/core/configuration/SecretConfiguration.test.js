const test = require("node:test");
const assert = require("node:assert/strict");

const ConfigurationRedactor = require(
    "../../../src/core/configuration/ConfigurationRedactor"
);
const SecretConfiguration = require(
    "../../../src/core/configuration/SecretConfiguration"
);
const SettingsService = require(
    "../../../src/core/settings/SettingsService"
);

const DEFINITIONS = Object.freeze({
    "discord.token": Object.freeze({
        environmentKey: "DISCORD_TOKEN"
    }),
    "gameServers.7dtd.password": Object.freeze({
        environmentKey: "SEVEN_DAYS_PASSWORD"
    }),
    "optional.apiKey": Object.freeze({
        environmentKey: "OPTIONAL_API_KEY",
        required: false
    })
});

test("reads only declared secret paths", () => {

    const secrets = new SecretConfiguration({
        environment: {
            DISCORD_TOKEN: "discord-token-value",
            SEVEN_DAYS_PASSWORD: "server-password-value"
        },
        definitions: DEFINITIONS
    });

    assert.equal(secrets.get("discord.token"), "discord-token-value");
    assert.equal(
        secrets.get("gameServers.7dtd.password"),
        "server-password-value"
    );
    assert.equal(secrets.has("discord.token"), true);
    assert.throws(
        () => secrets.get("unknown.secret"),
        /Unknown secret configuration path: unknown.secret/
    );

});

test("reports missing secret paths without exposing values", () => {

    const secrets = new SecretConfiguration({
        environment: {},
        definitions: DEFINITIONS
    });

    assert.throws(
        () => secrets.get("discord.token"),
        {
            message:
                "Required secret configuration is missing: discord.token"
        }
    );
    assert.equal(secrets.get("optional.apiKey"), null);

});

test("redacts nested token, password, secret, and api key values", () => {

    const redactor = new ConfigurationRedactor();
    const input = {
        discord: {
            token: "discord-token-value",
            clientId: "public-client-id"
        },
        servers: [
            {
                password: "server-password-value",
                host: "127.0.0.1"
            },
            {
                apiKey: "api-key-value"
            }
        ],
        message: "Login failed with discord-token-value"
    };

    const result = redactor.redact(input, ["discord-token-value"]);

    assert.deepEqual(result, {
        discord: {
            token: "[REDACTED]",
            clientId: "public-client-id"
        },
        servers: [
            {
                password: "[REDACTED]",
                host: "127.0.0.1"
            },
            {
                apiKey: "[REDACTED]"
            }
        ],
        message: "Login failed with [REDACTED]"
    });
    assert.equal(JSON.stringify(result).includes("discord-token-value"), false);
    assert.equal(JSON.stringify(result).includes("server-password-value"), false);
    assert.equal(JSON.stringify(result).includes("api-key-value"), false);

});

test("rejects secret setting mutation before persistence or audit", () => {

    let saveCalls = 0;
    let auditCalls = 0;
    const secretDefinition = Object.freeze({
        key: "discord.token",
        owner: "Discord",
        valueType: "STRING",
        changeMode: "SECRET",
        readPermission: "settings.view",
        updatePermission: "settings.update",
        secret: true
    });
    const service = new SettingsService({
        registry: {
            get: () => secretDefinition,
            list: () => Object.freeze([secretDefinition])
        },
        ownerReaders: {
            Discord: { get: () => "never-readable" }
        },
        ownerValidators: {
            Discord: { validate() {} }
        },
        store: {
            get: () => null,
            save() {
                saveCalls += 1;
            },
            delete() {
                return false;
            }
        },
        auditStore: {
            runTransaction(operation) {
                return operation();
            },
            record() {
                auditCalls += 1;
            }
        }
    });
    const actor = {
        actorId: "admin-1",
        permissions: ["settings.update", "settings.view"]
    };

    assert.throws(
        () => service.updateSetting(actor, "discord.token", "token-value"),
        /Secret settings cannot be updated here/
    );
    assert.equal(saveCalls, 0);
    assert.equal(auditCalls, 0);
    assert.throws(
        () => service.getSetting(actor, "discord.token"),
        /Secret setting values cannot be read/
    );

});
