const SettingsMigrations = require(
    "../settings/persistence/SettingsMigrations"
);
const ModerationMigrations = require(
    "../../modules/moderation/persistence/ModerationMigrations"
);
const EconomyMigrations = require(
    "../../modules/economy/persistence/EconomyMigrations"
);
const TicketMigrations = require(
    "../../modules/tickets/persistence/TicketMigrations"
);

class DatabaseMigrationLoader {

    load() {

        return [
            ...ModerationMigrations,
            ...EconomyMigrations,
            ...TicketMigrations,
            ...SettingsMigrations
        ];

    }

}

module.exports = new DatabaseMigrationLoader();
