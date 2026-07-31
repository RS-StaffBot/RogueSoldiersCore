const DiscordProvider = require("../discord/DiscordProvider");
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

        const providers = [
            new DiscordProvider({
                resolveGameServerProvider: name =>
                    providerManager.get(name),
                resolveIdentityModule: name =>
                    moduleManager.get(name)
            })
        ];
        const gameSettings = configuration.get(
            "providers.sevendaystodie",
            null
        );

        if (gameSettings !== null) {

            if (
                typeof gameSettings !== "object" ||
                Array.isArray(gameSettings)
            ) {
                throw new Error(
                    "7 Days to Die Provider configuration must be " +
                    "an object."
                );
            }

            const gameEnabled =
                gameSettings.enabled ?? false;

            if (typeof gameEnabled !== "boolean") {
                throw new Error(
                    "7 Days to Die enabled configuration must be " +
                    "a boolean."
                );
            }

            if (gameEnabled) {

                if (
                    typeof createSevenDaysToDieClient !==
                    "function"
                ) {
                    throw new Error(
                        "7 Days to Die client factory must be a function."
                    );
                }

                providers.push(
                    new SevenDaysToDieProvider({
                        client:
                            createSevenDaysToDieClient(),
                        configuration: gameSettings,
                        environment
                    })
                );

            }

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

        const websiteEnabled =
            websiteSettings.enabled ?? false;

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

}

module.exports = new ProviderLoader();
