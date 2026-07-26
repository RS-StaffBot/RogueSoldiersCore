const DiscordProvider = require("../discord/DiscordProvider");
const Configuration = require(
    "../../configuration/ConfigurationManager"
);
const SevenDaysToDieProvider = require(
    "../sevendaystodie/SevenDaysToDieProvider"
);

class ProviderLoader {

    load({
        configuration = Configuration,
        createSevenDaysToDieClient = null,
        environment = process.env
    } = {}) {

        const providers = [
            new DiscordProvider()
        ];
        const settings = configuration.get(
            "providers.sevendaystodie",
            null
        );

        if (settings === null) {
            return providers;
        }

        if (
            typeof settings !== "object" ||
            Array.isArray(settings)
        ) {
            throw new Error(
                "7 Days to Die Provider configuration must be " +
                "an object."
            );
        }

        const enabled = settings.enabled ?? false;

        if (typeof enabled !== "boolean") {
            throw new Error(
                "7 Days to Die enabled configuration must be " +
                "a boolean."
            );
        }

        if (!enabled) {
            return providers;
        }

        if (
            typeof createSevenDaysToDieClient !==
            "function"
        ) {
            throw new Error(
                "7 Days to Die Provider requires an injected " +
                "client until Phase 2."
            );
        }

        providers.push(
            new SevenDaysToDieProvider({
                client: createSevenDaysToDieClient(),
                configuration: settings,
                environment
            })
        );

        return providers;

    }

}

module.exports = new ProviderLoader();
