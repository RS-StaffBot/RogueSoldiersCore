const SettingsStore = require(
    "../../core/settings/persistence/SettingsStore"
);
const EconomyModule = require("../economy/EconomyModule");
const EconomySettingsResolver = require(
    "../economy/EconomySettingsResolver"
);
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

        const settingsStore = database
            ? database.createStore(SettingsStore)
            : null;
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
        const economyOptions = settingsStore
            ? new EconomySettingsResolver({
                store: settingsStore
            }).resolve()
            : {};

        return [
            new EconomyModule({
                ...economyOptions,
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
