const EconomyModule = require("../economy/EconomyModule");

class ModuleLoader {

    load() {

        return [

            new EconomyModule()

        ];

    }

}

module.exports = new ModuleLoader();