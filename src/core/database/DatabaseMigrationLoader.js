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
            ...TicketMigrations
        ];

    }

}

module.exports = new DatabaseMigrationLoader();
