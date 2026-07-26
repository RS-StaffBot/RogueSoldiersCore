const { test } = require("node:test");
const assert = require("node:assert/strict");

const WebsiteAuthenticationConfiguration = require(
    "../../../src/providers/website/" +
    "WebsiteAuthenticationConfiguration"
);

function createEnabledConfiguration(overrides = {}) {

    return {
        enabled: true,
        publicOrigin:
            "https://community.roguesoldiers.example",
        discordGuildId: "18446744073709551614",
        discordRequestTimeoutMs: 10000,
        oauthStateLifetimeMs: 600000,
        sessionIdleLifetimeMs: 1800000,
        sessionAbsoluteLifetimeMs: 28800000,
        ...overrides
    };

}

function createEnvironment(overrides = {}) {

    return {
        DISCORD_CLIENT_ID: "123456789012345678",
        DISCORD_CLIENT_SECRET: " secret-value ",
        ...overrides
    };

}

function createSnapshot({
    configuration = createEnabledConfiguration(),
    environment = createEnvironment()
} = {}) {

    return new WebsiteAuthenticationConfiguration({
        configuration,
        environment
    }).getSnapshot();

}

test("accepts disabled authentication without deployment values", () => {

    const configuration = {
        enabled: false,
        publicOrigin: "",
        discordGuildId: "",
        unknown: "omitted"
    };
    const authenticationConfiguration =
        new WebsiteAuthenticationConfiguration({
            configuration,
            environment: {}
        });
    const snapshot =
        authenticationConfiguration.getSnapshot();

    assert.deepStrictEqual(snapshot, {
        enabled: false
    });
    assert.strictEqual(Object.isFrozen(snapshot), true);
    assert.strictEqual(
        JSON.stringify(authenticationConfiguration),
        "{}"
    );

    configuration.enabled = true;
    configuration.publicOrigin = "https://changed.example";

    assert.deepStrictEqual(snapshot, {
        enabled: false
    });

});

test("treats missing authentication configuration as disabled", () => {

    const snapshot =
        new WebsiteAuthenticationConfiguration({
            environment: {}
        }).getSnapshot();

    assert.deepStrictEqual(
        snapshot,
        {
            enabled: false
        }
    );

});

test("rejects invalid authentication configuration structures", () => {

    const invalidConfigurations = [
        null,
        [],
        "disabled",
        {
            enabled: "false"
        }
    ];

    for (const configuration of invalidConfigurations) {
        assert.throws(
            () => createSnapshot({
                configuration
            }),
            /Website authentication/
        );
    }

});

test("creates an exact frozen enabled snapshot", () => {

    const configuration = createEnabledConfiguration({
        callbackUri: "https://attacker.example/callback",
        unknown: "omitted"
    });
    const environment = createEnvironment();
    const authenticationConfiguration =
        new WebsiteAuthenticationConfiguration({
            configuration,
            environment
        });
    const snapshot =
        authenticationConfiguration.getSnapshot();

    assert.deepStrictEqual(snapshot, {
        enabled: true,
        publicOrigin:
            "https://community.roguesoldiers.example",
        callbackUri:
            "https://community.roguesoldiers.example/" +
            "auth/discord/callback",
        discordGuildId: "18446744073709551614",
        discordClientId: "123456789012345678",
        discordRequestTimeoutMs: 10000,
        oauthStateLifetimeMs: 600000,
        sessionIdleLifetimeMs: 1800000,
        sessionAbsoluteLifetimeMs: 28800000
    });
    assert.strictEqual(Object.isFrozen(snapshot), true);
    assert.strictEqual(
        Object.hasOwn(snapshot, "unknown"),
        false
    );
    assert.strictEqual(
        Object.hasOwn(snapshot, "discordClientSecret"),
        false
    );
    assert.strictEqual(
        JSON.stringify(authenticationConfiguration)
            .includes(environment.DISCORD_CLIENT_SECRET),
        false
    );
    assert.strictEqual(
        JSON.stringify(snapshot)
            .includes(environment.DISCORD_CLIENT_SECRET),
        false
    );

    configuration.publicOrigin = "https://changed.example";
    configuration.discordGuildId = "1";
    environment.DISCORD_CLIENT_ID = "2";
    environment.DISCORD_CLIENT_SECRET = "changed";

    assert.strictEqual(
        snapshot.publicOrigin,
        "https://community.roguesoldiers.example"
    );
    assert.strictEqual(
        snapshot.discordGuildId,
        "18446744073709551614"
    );
    assert.strictEqual(
        snapshot.discordClientId,
        "123456789012345678"
    );

});

test("rejects invalid enabled public origins", () => {

    const invalidOrigins = [
        undefined,
        "",
        " https://community.example",
        "https://community.example ",
        "http://community.example",
        "community.example",
        "https://user@community.example",
        "https://user:pass@community.example",
        "https://community.example/path",
        "https://community.example/?x=1",
        "https://community.example/#fragment",
        "https://community.example/",
        "https://COMMUNITY.example",
        "https://community.example:443"
    ];

    for (const publicOrigin of invalidOrigins) {
        assert.throws(
            () => createSnapshot({
                configuration:
                    createEnabledConfiguration({
                        publicOrigin
                    })
            }),
            /Website authentication public origin/
        );
    }

});

test("accepts valid Discord snowflakes as strings", () => {

    const snapshot = createSnapshot({
        configuration: createEnabledConfiguration({
            discordGuildId: "1"
        }),
        environment: createEnvironment({
            DISCORD_CLIENT_ID:
                "18446744073709551615"
        })
    });

    assert.strictEqual(snapshot.discordGuildId, "1");
    assert.strictEqual(
        snapshot.discordClientId,
        "18446744073709551615"
    );

});

test("rejects invalid Discord guild IDs", () => {

    const invalidGuildIds = [
        undefined,
        "",
        123456789012345678n,
        " 123",
        "123 ",
        "12a3",
        "0",
        "18446744073709551616"
    ];

    for (const discordGuildId of invalidGuildIds) {
        assert.throws(
            () => createSnapshot({
                configuration:
                    createEnabledConfiguration({
                        discordGuildId
                    })
            }),
            /Discord guild ID/
        );
    }

});

test("rejects missing or invalid Discord client IDs", () => {

    const invalidClientIds = [
        undefined,
        "",
        123,
        " 123",
        "12a3",
        "0",
        "18446744073709551616"
    ];

    for (const discordClientId of invalidClientIds) {
        assert.throws(
            () => createSnapshot({
                environment: createEnvironment({
                    DISCORD_CLIENT_ID:
                        discordClientId
                })
            }),
            /Discord client ID/
        );
    }

});

test("requires but never exposes the Discord client secret", () => {

    for (const discordClientSecret of [
        undefined,
        ""
    ]) {
        assert.throws(
            () => createSnapshot({
                environment: createEnvironment({
                    DISCORD_CLIENT_SECRET:
                        discordClientSecret
                })
            }),
            error => {
                assert.strictEqual(
                    error.message.includes(
                        "secret-value"
                    ),
                    false
                );

                return (
                    error.message ===
                    "Website authentication Discord client " +
                    "secret is required."
                );
            }
        );
    }

    const secret = " preserve surrounding whitespace ";
    const environment = createEnvironment({
        DISCORD_CLIENT_SECRET: secret
    });
    const snapshot = createSnapshot({
        environment
    });

    assert.strictEqual(
        environment.DISCORD_CLIENT_SECRET,
        secret
    );
    assert.strictEqual(
        JSON.stringify(snapshot).includes(secret),
        false
    );

});

test("accepts every approved numeric boundary", () => {

    const minimumSnapshot = createSnapshot({
        configuration: createEnabledConfiguration({
            discordRequestTimeoutMs: 1,
            oauthStateLifetimeMs: 60000,
            sessionIdleLifetimeMs: 60000,
            sessionAbsoluteLifetimeMs: 60000
        })
    });
    const maximumSnapshot = createSnapshot({
        configuration: createEnabledConfiguration({
            discordRequestTimeoutMs: 60000,
            oauthStateLifetimeMs: 900000,
            sessionIdleLifetimeMs: 86400000,
            sessionAbsoluteLifetimeMs: 604800000
        })
    });

    assert.strictEqual(
        minimumSnapshot.discordRequestTimeoutMs,
        1
    );
    assert.strictEqual(
        minimumSnapshot.sessionAbsoluteLifetimeMs,
        60000
    );
    assert.strictEqual(
        maximumSnapshot.oauthStateLifetimeMs,
        900000
    );
    assert.strictEqual(
        maximumSnapshot.sessionAbsoluteLifetimeMs,
        604800000
    );

});

test("rejects invalid numeric configuration values", () => {

    const invalidValues = [
        {
            field: "discordRequestTimeoutMs",
            values: [0, 60001, 1.5, "10000", NaN, Infinity]
        },
        {
            field: "oauthStateLifetimeMs",
            values: [59999, 900001, 60000.5, "60000"]
        },
        {
            field: "sessionIdleLifetimeMs",
            values: [59999, 86400001, 60000.5, "60000"]
        },
        {
            field: "sessionAbsoluteLifetimeMs",
            values: [59999, 604800001, 60000.5, "60000"]
        }
    ];

    for (const invalid of invalidValues) {

        for (const value of invalid.values) {
            assert.throws(
                () => createSnapshot({
                    configuration:
                        createEnabledConfiguration({
                            [invalid.field]: value
                        })
                }),
                /must be an integer/
            );
        }

    }

});

test("rejects an absolute lifetime below the idle lifetime", () => {

    assert.throws(
        () => createSnapshot({
            configuration: createEnabledConfiguration({
                sessionIdleLifetimeMs: 120000,
                sessionAbsoluteLifetimeMs: 60000
            })
        }),
        {
            message:
                "Website authentication session absolute lifetime " +
                "must be at least the session idle lifetime."
        }
    );

});
