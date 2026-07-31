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
const IdentityMigrations = require(
    "../../modules/identity/persistence/IdentityMigrations"
);

class DatabaseMigrationLoader {

    load() {

        return [
            ...ModerationMigrations,
            ...EconomyMigrations,
            ...TicketMigrations,
            ...SettingsMigrations,
            ...IdentityMigrations
        ];

    }

}

module.exports = new DatabaseMigrationLoader();
