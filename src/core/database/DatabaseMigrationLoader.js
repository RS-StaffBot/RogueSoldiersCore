const ModerationMigrations = require(
    "../../modules/moderation/persistence/ModerationMigrations"
);
const EconomyMigrations = require(
    "../../modules/economy/persistence/EconomyMigrations"
);

class DatabaseMigrationLoader {

    load() {

        return [
            ...ModerationMigrations,
            ...EconomyMigrations
        ];

    }

}

module.exports = new DatabaseMigrationLoader();
