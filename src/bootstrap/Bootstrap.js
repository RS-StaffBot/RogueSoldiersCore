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

    static start() {

        Configuration.load();

        Registry.register("logger", Logger);
        Registry.register("config", Configuration);
        Registry.register("eventBus", EventBus);
        Registry.register("database", Database);
        Registry.register("providers", ProviderManager);
        Registry.register("modules", ModuleManager);

        Logger.info(`Starting ${Configuration.get("core.app.name")}`);
        Logger.info(`Version ${Configuration.get("core.app.version")}`);
        Logger.info("");

        Database.initialize();
        Database.start();

        const providers = ProviderLoader.load();

        for (const provider of providers) {
            ProviderManager.register(provider);
        }

        ProviderManager.initializeAll();
        ProviderManager.startAll();

        const modules = ModuleLoader.load({
            database: Database
        });

        for (const module of modules) {
            ModuleManager.register(module);
        }

        ModuleManager.initializeAll();
        ModuleManager.startAll();

        Logger.info("Loaded Core Services:");
        Logger.info(
            `- ${Database.name} (${Database.state}, ` +
            `${Database.checkHealth() ? "HEALTHY" : "UNHEALTHY"})`
        );
        Logger.info("");

        Logger.info("Loaded Providers:");

        for (const name of ProviderManager.list()) {

            const provider = ProviderManager.get(name);

            Logger.info(`- ${provider.name} (${provider.state})`);

        }

        Logger.info("");

        Logger.info("Loaded Modules:");

        for (const name of ModuleManager.list()) {

            const module = ModuleManager.get(name);

            Logger.info(`- ${module.name} (${module.state})`);

        }

        Logger.info("");
        Logger.info("Framework started successfully.");

    }

    static stop() {

        ModuleManager.stopAll();
        ProviderManager.stopAll();
        Database.stop();

        Logger.info("Framework stopped successfully.");

    }

}

module.exports = Bootstrap;
