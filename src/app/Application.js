const Bootstrap = require("../bootstrap/Bootstrap");

class Application {
    start() {
        console.clear();

        console.log("========================================");
        console.log("     Rogue Soldiers Framework");
        console.log("            Version 0.1.0");
        console.log("========================================");
        console.log("");

        Bootstrap.start();
    }
}

module.exports = Application;