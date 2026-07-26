const { test } = require("node:test");
const assert = require("node:assert/strict");

const DatabaseMigrationLoader = require(
    "../../src/core/database/DatabaseMigrationLoader"
);
const DatabaseMigrationManager = require(
    "../../src/core/database/DatabaseMigrationManager"
);

test("loads migrations in the verified global order", () => {

    const migrations = DatabaseMigrationLoader.load();

    assert.deepStrictEqual(
        migrations.map(migration => migration.id),
        [
            "001_create_moderation_audit_records",
            "002_create_economy_ledger",
            "003_create_ticket_aggregate"
        ]
    );

});

test("rejects duplicate migration identifiers", () => {

    const manager = new DatabaseMigrationManager({});
    const duplicateMigrations = [
        {
            id: "001_duplicate",
            sql: "SELECT 1"
        },
        {
            id: "001_duplicate",
            sql: "SELECT 2"
        }
    ];

    assert.throws(
        () => manager.validateMigrations(
            duplicateMigrations
        ),
        {
            message:
                "Duplicate database migration ID: 001_duplicate"
        }
    );

});
