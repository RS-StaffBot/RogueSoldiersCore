const BaseProvider = require("../core/BaseProvider");
const ComponentState = require("../../core/ComponentState");
const WebsiteAuthenticationConfiguration = require(
    "./WebsiteAuthenticationConfiguration"
);
const DiscordOAuthClient = require(
    "./DiscordOAuthClient"
);
const InMemoryWebsiteOAuthStateStore = require(
    "./InMemoryWebsiteOAuthStateStore"
);
const InMemoryWebsiteSessionStore = require(
    "./InMemoryWebsiteSessionStore"
);
const WebsiteAuthenticator = require(
    "./WebsiteAuthenticator"
);
const WebsiteCookieService = require(
    "./WebsiteCookieService"
);
const WebsiteOAuthFlow = require(
    "./WebsiteOAuthFlow"
);
const WebsiteServer = require("./WebsiteServer");

class WebsiteProvider extends BaseProvider {

    constructor({
        configuration,
        createAuthenticator = options =>
            new WebsiteAuthenticator(options),
        createCookieService = options =>
            new WebsiteCookieService(options),
        createDiscordOAuthClient = options =>
            new DiscordOAuthClient(options),
        createOAuthFlow = options =>
            new WebsiteOAuthFlow(options),
        createOAuthStateStore = options =>
            new InMemoryWebsiteOAuthStateStore(options),
        createServer = options =>
            new WebsiteServer(options),
        createSessionStore = options =>
            new InMemoryWebsiteSessionStore(options),
        environment = process.env,
        server = null
    } = {}) {

        super("Website");

        this.configuration = configuration;
        this.createAuthenticator = createAuthenticator;
        this.createCookieService = createCookieService;
        this.createDiscordOAuthClient =
            createDiscordOAuthClient;
        this.createOAuthFlow = createOAuthFlow;
        this.createOAuthStateStore =
            createOAuthStateStore;
        this.createServer =
            server === null
                ? createServer
                : () => server;
        this.createSessionStore =
            createSessionStore;
        this.environment = environment;
        this.server = null;
        this.oauthFlow = null;
        this.oauthStateStore = null;
        this.sessionStore = null;
        this.authenticationOptions = null;
        this.serverOptions = null;
        this.serverStartAttempted = false;

    }

    initialize() {

        this.state = ComponentState.INITIALIZING;

        try {

            this.serverOptions = this.createServerOptions();
            this.authenticationOptions =
                new WebsiteAuthenticationConfiguration({
                    configuration:
                        this.configuration.authentication,
                    environment: this.environment
                }).getSnapshot();

            this.constructBoundaries();
            this.validateServer();

            super.initialize();

            return this.getStatus();

        } catch (error) {
            this.setError();
            throw error;
        }

    }

    async start() {

        if (this.state !== ComponentState.READY) {
            throw new Error(
                "Website Provider must be ready before startup."
            );
        }

        this.state = ComponentState.STARTING;
        this.serverStartAttempted = true;

        let startupServerLossError = null;

        try {

            await this.server.start(
                this.serverOptions,
                error => {

                    const wasStarting =
                        this.state ===
                        ComponentState.STARTING;
                    const serverLossError =
                        this.handleUnexpectedServerLoss(
                            error
                        );

                    if (wasStarting) {
                        startupServerLossError =
                            serverLossError;
                    }

                }
            );

            if (startupServerLossError) {
                throw startupServerLossError;
            }

            super.start();

            return this.getStatus();

        } catch (error) {
            this.setError();
            throw error;
        }

    }

    async stop() {

        if (this.state === ComponentState.STOPPED) {
            return this.getStatus();
        }

        this.state = ComponentState.STOPPING;

        const errors = [];

        if (this.oauthFlow !== null) {
            try {
                this.oauthFlow.beginShutdown();
            } catch (error) {
                errors.push(error);
            }
        }

        try {

            if (
                this.serverStartAttempted &&
                this.server !== null
            ) {
                await this.server.stop();
                this.serverStartAttempted = false;
            }

        } catch (error) {
            errors.push(error);
        } finally {

            for (const store of [
                this.oauthStateStore,
                this.sessionStore
            ]) {
                if (store !== null) {
                    try {
                        store.clear();
                    } catch (error) {
                        errors.push(error);
                    }
                }
            }

        }

        if (errors.length > 0) {
            this.setError();
            throw new AggregateError(
                errors,
                "Website Provider cleanup failed."
            );
        }

        super.stop();

        return this.getStatus();

    }

    handleUnexpectedServerLoss(error) {

        if (
            this.state === ComponentState.STOPPING ||
            this.state === ComponentState.STOPPED ||
            this.state === ComponentState.ERROR
        ) {
            return null;
        }

        const serverLossError =
            error instanceof Error
                ? error
                : new Error(
                    "Website server was lost."
                );

        this.setError();

        return serverLossError;

    }

    validateServer() {

        if (
            !this.server ||
            typeof this.server.start !== "function" ||
            typeof this.server.stop !== "function"
        ) {
            throw new Error(
                "Website server must provide start and stop operations."
            );
        }

    }

    constructBoundaries() {

        this.validateFactories(
            this.authenticationOptions.enabled
        );

        if (!this.authenticationOptions.enabled) {

            const authenticator =
                this.createAuthenticator();

            this.server = this.createServer({
                authenticator
            });

            return;
        }

        const options = this.authenticationOptions;
        const oauthClient =
            this.createDiscordOAuthClient({
                callbackUri: options.callbackUri,
                clientId: options.discordClientId,
                clientSecret:
                    this.environment
                        .DISCORD_CLIENT_SECRET,
                guildId: options.discordGuildId,
                requestTimeoutMs:
                    options.discordRequestTimeoutMs
            });
        this.oauthStateStore =
            this.createOAuthStateStore({
                lifetimeMs:
                    options.oauthStateLifetimeMs
            });
        this.sessionStore =
            this.createSessionStore({
                absoluteLifetimeMs:
                    options.sessionAbsoluteLifetimeMs,
                idleLifetimeMs:
                    options.sessionIdleLifetimeMs
            });
        const cookieService =
            this.createCookieService({
                oauthStateLifetimeMs:
                    options.oauthStateLifetimeMs,
                sessionAbsoluteLifetimeMs:
                    options.sessionAbsoluteLifetimeMs
            });
        this.oauthFlow = this.createOAuthFlow({
            cookieService,
            oauthClient,
            sessionStore: this.sessionStore,
            stateStore: this.oauthStateStore
        });
        const authenticator =
            this.createAuthenticator({
                cookieService,
                sessionStore: this.sessionStore
            });

        this.server = this.createServer({
            authenticator,
            cookieService,
            oauthFlow: this.oauthFlow,
            publicOrigin: options.publicOrigin
        });

    }

    validateFactories(authenticationEnabled) {

        const factories = [
            this.createAuthenticator,
            this.createServer
        ];

        if (authenticationEnabled) {
            factories.push(
                this.createCookieService,
                this.createDiscordOAuthClient,
                this.createOAuthFlow,
                this.createOAuthStateStore,
                this.createSessionStore
            );
        }

        if (
            factories.some(
                factory =>
                    typeof factory !== "function"
            )
        ) {
            throw new Error(
                "Website Provider construction boundary is invalid."
            );
        }

    }

    createServerOptions() {

        const configuration = this.configuration;

        if (
            !configuration ||
            typeof configuration !== "object" ||
            Array.isArray(configuration)
        ) {
            throw new Error(
                "Website Provider configuration is required."
            );
        }

        if (configuration.enabled !== true) {
            throw new Error(
                "Website Provider configuration must be enabled."
            );
        }

        const host = configuration.host;
        const port = configuration.port;
        const requestTimeoutMs =
            configuration.requestTimeoutMs;
        const shutdownTimeoutMs =
            configuration.shutdownTimeoutMs;

        if (host !== "127.0.0.1") {
            throw new Error(
                "Website host must equal 127.0.0.1."
            );
        }

        if (
            !Number.isInteger(port) ||
            port < 1 ||
            port > 65535
        ) {
            throw new Error(
                "Website port must be an integer from 1 through 65535."
            );
        }

        if (
            !Number.isSafeInteger(requestTimeoutMs) ||
            requestTimeoutMs < 1
        ) {
            throw new Error(
                "Website request timeout must be a positive safe integer."
            );
        }

        if (
            !Number.isSafeInteger(shutdownTimeoutMs) ||
            shutdownTimeoutMs < 1
        ) {
            throw new Error(
                "Website shutdown timeout must be a positive safe integer."
            );
        }

        return {
            host,
            port,
            requestTimeoutMs,
            shutdownTimeoutMs
        };

    }

}

module.exports = WebsiteProvider;
