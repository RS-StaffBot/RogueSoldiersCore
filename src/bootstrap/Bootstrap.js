const Logger = require("../core/Logger");
const Registry = require("../core/Registry");
const EventBus = require("../core/EventBus");
const DatabaseService = require(
    "../core/database/DatabaseService"
);
const DatabaseMigrationLoader = require(
    "../core/database/DatabaseMigrationLoader"
);

const Configuration = require("../configuration/ConfigurationManager");

const ProviderManager = require("../providers/core/ProviderManager");
const ProviderLoader = require("../providers/core/ProviderLoader");

const ModuleManager = require("../modules/core/ModuleManager");
const ModuleLoader = require("../modules/core/ModuleLoader");

const Database = new DatabaseService({
    migrations: DatabaseMigrationLoader.load()
});

class Bootstrap {

    static async start() {

        let databaseActive = false;
        let modulesActive = false;
        let providersActive = false;

        try {

            Configuration.load();

            Registry.register("logger", Logger);
            Registry.register("config", Configuration);
            Registry.register("eventBus", EventBus);
            Registry.register("database", Database);
            Registry.register("providers", ProviderManager);
            Registry.register("modules", ModuleManager);

            Logger.info(
                `Starting ${Configuration.get("core.app.name")}`
            );
            Logger.info(
                `Version ${Configuration.get("core.app.version")}`
            );
            Logger.info("");

            Database.initialize();
            databaseActive = true;
            await Database.start();

            const modules = ModuleLoader.load({
                database: Database
            });

            for (const module of modules) {
                ModuleManager.register(module);
            }

            modulesActive = true;
            await ModuleManager.initializeAll();
            await ModuleManager.startAll();

            const providers = ProviderLoader.load();

            for (const provider of providers) {
                ProviderManager.register(provider);
            }

            providersActive = true;
            await ProviderManager.initializeAll();
            await ProviderManager.startAll();

            Logger.info("Loaded Core Services:");
            Logger.info(
                `- ${Database.name} (${Database.state}, ` +
                `${Database.checkHealth()
                    ? "HEALTHY"
                    : "UNHEALTHY"})`
            );
            Logger.info("");

            Logger.info("Loaded Providers:");

            for (const name of ProviderManager.list()) {

                const provider = ProviderManager.get(name);

                Logger.info(
                    `- ${provider.name} (${provider.state})`
                );

            }

            Logger.info("");

            Logger.info("Loaded Modules:");

            for (const name of ModuleManager.list()) {

                const module = ModuleManager.get(name);

                Logger.info(
                    `- ${module.name} (${module.state})`
                );

            }

            Logger.info("");
            Logger.info("Framework started successfully.");

        } catch (startupError) {

            const cleanupLayers = [];

            if (providersActive) {
                cleanupLayers.push({
                    name: "Provider",
                    stop: () => ProviderManager.stopAll()
                });
            }

            if (modulesActive) {
                cleanupLayers.push({
                    name: "Module",
                    stop: () => ModuleManager.stopAll()
                });
            }

            if (databaseActive) {
                cleanupLayers.push({
                    name: "Database",
                    stop: () => Database.stop()
                });
            }

            for (const layer of cleanupLayers) {

                try {
                    await layer.stop();
                } catch (cleanupError) {
                    Logger.error(
                        `${layer.name} cleanup failed during ` +
                        "startup rollback."
                    );
                    Logger.error(
                        cleanupError.stack ||
                        cleanupError.message
                    );
                }

            }

            throw startupError;

        }

    }

    static async stop() {

        const errors = [];
        const layers = [
            {
                name: "Provider",
                stop: () => ProviderManager.stopAll()
            },
            {
                name: "Module",
                stop: () => ModuleManager.stopAll()
            },
            {
                name: "Database",
                stop: () => Database.stop()
            }
        ];

        for (const layer of layers) {

            try {
                await layer.stop();
            } catch (error) {
                errors.push(error);
                Logger.error(
                    `${layer.name} shutdown failed.`
                );
                Logger.error(error.stack || error.message);
            }

        }

        if (errors.length > 0) {
            throw new AggregateError(
                errors,
                "Framework shutdown encountered errors."
            );
        }

        Logger.info("Framework stopped successfully.");

    }

}

module.exports = Bootstrap;
