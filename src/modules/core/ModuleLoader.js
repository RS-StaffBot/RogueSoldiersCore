const EconomyModule = require("../economy/EconomyModule");
const SqliteEconomyStore = require(
    "../economy/persistence/SqliteEconomyStore"
);
const ModerationModule = require("../moderation/ModerationModule");
const SqliteModerationStore = require(
    "../moderation/persistence/SqliteModerationStore"
);
const TicketModule = require("../tickets/TicketModule");
const SqliteTicketStore = require(
    "../tickets/persistence/SqliteTicketStore"
);

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
        const ticketStore = database
            ? database.createStore(
                SqliteTicketStore
            )
            : undefined;

        return [
            new EconomyModule({
                store: economyStore
            }),
            new ModerationModule({
                store: moderationStore
            }),
            new TicketModule({
                store: ticketStore
            })
        ];

    }

}

module.exports = new ModuleLoader();
