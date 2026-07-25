const EconomyModule = require("../economy/EconomyModule");
const ModerationModule = require("../moderation/ModerationModule");

class ModuleLoader {

    load() {

        return [
            new EconomyModule(),
            new ModerationModule()
        ];

    }

}

module.exports = new ModuleLoader();