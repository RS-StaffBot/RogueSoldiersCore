const EconomyModule = require("../economy/EconomyModule");
const ModerationModule = require("../moderation/ModerationModule");
const SqliteModerationStore = require(
    "../moderation/persistence/SqliteModerationStore"
);
const TicketModule = require("../tickets/TicketModule");

class ModuleLoader {

    load({
        database = null
    } = {}) {

        const moderationStore = database
            ? database.createStore(
                SqliteModerationStore
            )
            : undefined;

        return [
            new EconomyModule(),
            new ModerationModule({
                store: moderationStore
            }),
            new TicketModule()
        ];

    }

}

module.exports = new ModuleLoader();
