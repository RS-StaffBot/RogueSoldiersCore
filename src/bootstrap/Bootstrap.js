const Logger = require("../core/Logger");

class Bootstrap {
    static start() {
        Logger.info("Starting Rogue Soldiers Framework...");
        Logger.info("Loading configuration...");
        Logger.info("Loading providers...");
        Logger.info("Loading modules...");
        Logger.info("Framework started successfully.");
    }
}

module.exports = Bootstrap;