const Bootstrap = require("../bootstrap/Bootstrap");

class Application {

    start() {

        console.clear();

        console.log("========================================");
        console.log("     Rogue Soldiers Framework");
        console.log("========================================");
        console.log("");

        Bootstrap.start();

    }

    stop() {

        Bootstrap.stop();

    }

}

module.exports = Application;
