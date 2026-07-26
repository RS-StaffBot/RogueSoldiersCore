const EconomyModule = require("../economy/EconomyModule");
const ModerationModule = require("../moderation/ModerationModule");
const TicketModule = require("../tickets/TicketModule");

class ModuleLoader {

    load() {

        return [
            new EconomyModule(),
            new ModerationModule(),
            new TicketModule()
        ];

    }

}

module.exports = new ModuleLoader();
