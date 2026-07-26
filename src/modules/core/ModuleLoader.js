const EconomyModule = require("../economy/EconomyModule");
const SqliteEconomyStore = require(
    "../economy/persistence/SqliteEconomyStore"
);
const ModerationModule = require("../moderation/ModerationModule");
const SqliteModerationStore = require(
    "../moderation/persistence/SqliteModerationStore"
);
const TicketModule = require("../tickets/TicketModule");

class ModuleLoader {

    load({
        database = null
    } = {}) {

        const economyStore = database
            ? database.createStore(
                SqliteEconomyStore
            )
            : undefined;
        const moderationStore = database
            ? database.createStore(
                SqliteModerationStore
            )
            : undefined;

        return [
            new EconomyModule({
                store: economyStore
            }),
            new ModerationModule({
                store: moderationStore
            }),
            new TicketModule()
        ];

    }

}

module.exports = new ModuleLoader();
