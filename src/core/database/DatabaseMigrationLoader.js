const ModerationMigrations = require(
    "../../modules/moderation/persistence/ModerationMigrations"
);

class DatabaseMigrationLoader {

    load() {

        return [
            ...ModerationMigrations
        ];

    }

}

module.exports = new DatabaseMigrationLoader();
