const AuditRecordingService = require(
    "../../modules/audit/services/AuditRecordingService"
);
const DiscordProvider = require("../discord/DiscordProvider");
const CommandLoader = require(
    "../discord/commands/CommandLoader"
);
const DiscordHostedPlayerAuditService = require(
    "../discord/services/DiscordHostedPlayerAuditService"
);
const DiscordLifecycleAuditService = require(
    "../discord/services/DiscordLifecycleAuditService"
);
const DiscordLifecycleService = require(
    "../discord/services/DiscordLifecycleService"
);
const DiscordModerationAuditService = require(
    "../discord/services/DiscordModerationAuditService"
);
const DiscordTicketAuditService = require(
    "../discord/services/DiscordTicketAuditService"
);
const Configuration = require(
    "../../configuration/ConfigurationManager"
);
const ModuleManager = require(
    "../../modules/core/ModuleManager"
);
const ProviderManager = require("./ProviderManager");
const SevenDaysToDieProvider = require(
    "../sevendaystodie/SevenDaysToDieProvider"
);
const SevenDaysToDieTelnetClient = require(
    "../sevendaystodie/SevenDaysToDieTelnetClient"
);
const WebsiteProvider = require(
    "../website/WebsiteProvider"
);
const WebsiteServer = require(
    "../website/WebsiteServer"
);

class ProviderLoader {

    load({
        configuration = Configuration,
        createSevenDaysToDieClient = () =>
            new SevenDaysToDieTelnetClient(),
        createWebsiteServer = options =>
            new WebsiteServer(options),
        environment = process.env,
        moduleManager = ModuleManager,
        providerManager = ProviderManager
    } = {}) {

        if (
            !providerManager ||
            typeof providerManager.get !== "function"
        ) {
            throw new Error(
                "Discord game Provider Manager boundary is invalid."
            );
        }

        const websiteSettings = configuration.get(
            "providers.website",
            null
        );

        if (
            !moduleManager ||
            typeof moduleManager.get !== "function"
        ) {
            if (
                websiteSettings &&
                typeof websiteSettings === "object" &&
                !Array.isArray(websiteSettings) &&
                websiteSettings.enabled === true
            ) {
                throw new Error(
                    "Website Module Manager boundary is invalid."
                );
            }

            throw new Error(
                "Discord Identity Module Manager boundary is invalid."
            );
        }

        let hostedPlayerAuditService;
        let lifecycleService;
        let lifecycleAuditService;
        let moderationAuditService;
        let ticketAuditService;
        if (
            typeof providerManager.getProviderStatus === "function" &&
            typeof providerManager.restartProvider === "function" &&
            typeof providerManager.replaceProvider === "function"
        ) {
            lifecycleService = new DiscordLifecycleService({
                createReplacement: () => this.createProvider(
                    "7 Days to Die",
                    {
                        configuration,
                        createSevenDaysToDieClient,
                        environment,
                        reloadConfiguration: true
                    }
                ),
                providerManager
            }).asBoundary();

            const auditServices =
                this.createDiscordAuditServices(moduleManager);

            hostedPlayerAuditService = auditServices.hostedPlayer;
            lifecycleAuditService = auditServices.lifecycle;
            moderationAuditService = auditServices.moderation;
            ticketAuditService = auditServices.ticket;
        }

        const commandLoader = Object.freeze({
            load: options => CommandLoader.load({
                ...options,
                hostedPlayerAuditService
            })
        });
        const providers = [
            new DiscordProvider({
                commandLoader,
                lifecycleAuditService,
                lifecycleService,
                moderationAuditService,
                ticketAuditService,
                resolveGameServerProvider: name =>
                    providerManager.get(name),
                resolveIdentityModule: name =>
                    moduleManager.get(name)
            })
        ];
        const gameProvider = this.createProvider(
            "7 Days to Die",
            {
                configuration,
                createSevenDaysToDieClient,
                environment
            }
        );

        if (gameProvider !== null) {
            providers.push(gameProvider);
        }

        if (websiteSettings === null) {
            return providers;
        }

        if (
            typeof websiteSettings !== "object" ||
            Array.isArray(websiteSettings)
        ) {
            throw new Error(
                "Website Provider configuration must be an object."
            );
        }

        const websiteEnabled = websiteSettings.enabled ?? false;

        if (typeof websiteEnabled !== "boolean") {
            throw new Error(
                "Website enabled configuration must be a boolean."
            );
        }

        if (!websiteEnabled) {
            return providers;
        }

        if (typeof createWebsiteServer !== "function") {
            throw new Error(
                "Website server factory must be a function."
            );
        }

        providers.push(
            new WebsiteProvider({
                configuration: websiteSettings,
                createServer: createWebsiteServer,
                environment,
                resolveTicketModule: () =>
                    moduleManager.get("Tickets")
            })
        );

        return providers;
    }

    createDiscordAuditServices(moduleManager) {

        const unavailable = Object.freeze({
            hostedPlayer: undefined,
            lifecycle: undefined,
            moderation: undefined,
            ticket: undefined
        });
        let auditModule;

        try {
            auditModule = moduleManager.get("Audit");
        } catch {
            return unavailable;
        }

        if (
            !auditModule ||
            typeof auditModule.recordAction !== "function"
        ) {
            return unavailable;
        }

        try {
            const recordingService = new AuditRecordingService({
                auditModule
            });

            return Object.freeze({
                hostedPlayer: new DiscordHostedPlayerAuditService({
                    recordingService
                }).asBoundary(),
                lifecycle: new DiscordLifecycleAuditService({
                    recordingService
                }).asBoundary(),
                moderation: new DiscordModerationAuditService({
                    recordingService
                }).asBoundary(),
                ticket: new DiscordTicketAuditService({
                    recordingService
                }).asBoundary()
            });
        } catch {
            return unavailable;
        }

    }

    createProvider(name, {
        configuration = Configuration,
        createSevenDaysToDieClient = () =>
            new SevenDaysToDieTelnetClient(),
        environment = process.env,
        reloadConfiguration = false
    } = {}) {

        if (name !== "7 Days to Die") {
            return null;
        }

        if (
            !configuration ||
            typeof configuration.get !== "function" ||
            (reloadConfiguration &&
                typeof configuration.load !== "function")
        ) {
            throw new Error(
                "Provider reconstruction configuration boundary is invalid."
            );
        }

        if (reloadConfiguration) {
            configuration.load();
        }

        const gameSettings = configuration.get(
            "providers.sevendaystodie",
            null
        );

        if (gameSettings === null) {
            return null;
        }

        if (
            typeof gameSettings !== "object" ||
            Array.isArray(gameSettings)
        ) {
            throw new Error(
                "7 Days to Die Provider configuration must be an object."
            );
        }

        const gameEnabled = gameSettings.enabled ?? false;

        if (typeof gameEnabled !== "boolean") {
            throw new Error(
                "7 Days to Die enabled configuration must be a boolean."
            );
        }

        if (!gameEnabled) {
            return null;
        }

        if (typeof createSevenDaysToDieClient !== "function") {
            throw new Error(
                "7 Days to Die client factory must be a function."
            );
        }

        return new SevenDaysToDieProvider({
            client: createSevenDaysToDieClient(),
            configuration: gameSettings,
            environment
        });
    }

    canReconstruct(name) {
        return name === "7 Days to Die";
    }

}

module.exports = new ProviderLoader();
