const Bootstrap = require("../bootstrap/Bootstrap");

class Application {

    async start() {

        console.clear();

        console.log("========================================");
        console.log("     Rogue Soldiers Framework");
        console.log("========================================");
        console.log("");

        await Bootstrap.start();

    }

    async stop() {

        await Bootstrap.stop();

    }

}

module.exports = Application;
