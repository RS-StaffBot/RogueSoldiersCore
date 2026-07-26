const { URL } = require("node:url");

const MAXIMUM_DISCORD_REQUEST_TIMEOUT_MS = 60000;
const MINIMUM_OAUTH_STATE_LIFETIME_MS = 60000;
const MAXIMUM_OAUTH_STATE_LIFETIME_MS = 900000;
const MINIMUM_SESSION_LIFETIME_MS = 60000;
const MAXIMUM_SESSION_IDLE_LIFETIME_MS = 86400000;
const MAXIMUM_SESSION_ABSOLUTE_LIFETIME_MS = 604800000;
const MAXIMUM_DISCORD_SNOWFLAKE = (1n << 64n) - 1n;

class WebsiteAuthenticationConfiguration {

    #snapshot;

    constructor({
        configuration,
        environment = process.env
    } = {}) {

        this.#snapshot = this.createSnapshot(
            configuration,
            environment
        );

    }

    getSnapshot() {
        return this.#snapshot;
    }

    createSnapshot(configuration, environment) {

        if (configuration === undefined) {
            return Object.freeze({
                enabled: false
            });
        }

        if (
            !configuration ||
            typeof configuration !== "object" ||
            Array.isArray(configuration)
        ) {
            throw new Error(
                "Website authentication configuration must be an object."
            );
        }

        const enabled = configuration.enabled ?? false;

        if (typeof enabled !== "boolean") {
            throw new Error(
                "Website authentication enabled configuration must be " +
                "a boolean."
            );
        }

        if (!enabled) {
            return Object.freeze({
                enabled: false
            });
        }

        const publicOrigin = this.validatePublicOrigin(
            configuration.publicOrigin
        );
        const discordGuildId = this.validateDiscordSnowflake(
            configuration.discordGuildId,
            "Website authentication Discord guild ID"
        );
        const discordClientId = this.validateDiscordSnowflake(
            environment?.DISCORD_CLIENT_ID,
            "Website authentication Discord client ID"
        );
        const discordClientSecret =
            environment?.DISCORD_CLIENT_SECRET;

        if (
            typeof discordClientSecret !== "string" ||
            discordClientSecret.length === 0
        ) {
            throw new Error(
                "Website authentication Discord client secret is required."
            );
        }

        const discordRequestTimeoutMs =
            this.validateInteger(
                configuration.discordRequestTimeoutMs,
                "Website authentication Discord request timeout",
                1,
                MAXIMUM_DISCORD_REQUEST_TIMEOUT_MS
            );
        const oauthStateLifetimeMs =
            this.validateInteger(
                configuration.oauthStateLifetimeMs,
                "Website authentication OAuth state lifetime",
                MINIMUM_OAUTH_STATE_LIFETIME_MS,
                MAXIMUM_OAUTH_STATE_LIFETIME_MS
            );
        const sessionIdleLifetimeMs =
            this.validateInteger(
                configuration.sessionIdleLifetimeMs,
                "Website authentication session idle lifetime",
                MINIMUM_SESSION_LIFETIME_MS,
                MAXIMUM_SESSION_IDLE_LIFETIME_MS
            );
        const sessionAbsoluteLifetimeMs =
            this.validateInteger(
                configuration.sessionAbsoluteLifetimeMs,
                "Website authentication session absolute lifetime",
                MINIMUM_SESSION_LIFETIME_MS,
                MAXIMUM_SESSION_ABSOLUTE_LIFETIME_MS
            );

        if (
            sessionAbsoluteLifetimeMs <
            sessionIdleLifetimeMs
        ) {
            throw new Error(
                "Website authentication session absolute lifetime must " +
                "be at least the session idle lifetime."
            );
        }

        return Object.freeze({
            enabled: true,
            publicOrigin,
            callbackUri:
                `${publicOrigin}/auth/discord/callback`,
            discordGuildId,
            discordClientId,
            discordRequestTimeoutMs,
            oauthStateLifetimeMs,
            sessionIdleLifetimeMs,
            sessionAbsoluteLifetimeMs
        });

    }

    validatePublicOrigin(publicOrigin) {

        if (
            typeof publicOrigin !== "string" ||
            publicOrigin.length === 0
        ) {
            throw new Error(
                "Website authentication public origin is required."
            );
        }

        if (publicOrigin !== publicOrigin.trim()) {
            throw new Error(
                "Website authentication public origin must not contain " +
                "surrounding whitespace."
            );
        }

        let parsedOrigin;

        try {
            parsedOrigin = new URL(publicOrigin);
        } catch {
            throw new Error(
                "Website authentication public origin must be an " +
                "absolute URL."
            );
        }

        if (parsedOrigin.protocol !== "https:") {
            throw new Error(
                "Website authentication public origin must use HTTPS."
            );
        }

        if (
            parsedOrigin.username.length > 0 ||
            parsedOrigin.password.length > 0
        ) {
            throw new Error(
                "Website authentication public origin must not contain " +
                "credentials."
            );
        }

        if (parsedOrigin.pathname !== "/") {
            throw new Error(
                "Website authentication public origin must not contain " +
                "a path."
            );
        }

        if (parsedOrigin.search.length > 0) {
            throw new Error(
                "Website authentication public origin must not contain " +
                "a query."
            );
        }

        if (parsedOrigin.hash.length > 0) {
            throw new Error(
                "Website authentication public origin must not contain " +
                "a fragment."
            );
        }

        if (parsedOrigin.origin !== publicOrigin) {
            throw new Error(
                "Website authentication public origin must be canonical " +
                "and must not end with a trailing slash."
            );
        }

        return parsedOrigin.origin;

    }

    validateDiscordSnowflake(value, name) {

        if (
            typeof value !== "string" ||
            value.length === 0 ||
            !/^[0-9]+$/.test(value)
        ) {
            throw new Error(
                `${name} must be a positive decimal string.`
            );
        }

        const snowflake = BigInt(value);

        if (
            snowflake < 1n ||
            snowflake > MAXIMUM_DISCORD_SNOWFLAKE
        ) {
            throw new Error(
                `${name} must fit within an unsigned 64-bit integer.`
            );
        }

        return value;

    }

    validateInteger(value, name, minimum, maximum) {

        if (
            !Number.isInteger(value) ||
            value < minimum ||
            value > maximum
        ) {
            throw new Error(
                `${name} must be an integer from ${minimum} ` +
                `through ${maximum}.`
            );
        }

        return value;

    }

}

module.exports = WebsiteAuthenticationConfiguration;
