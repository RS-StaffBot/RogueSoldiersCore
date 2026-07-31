const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const DatabaseMigrationLoader = require(
    "../../../src/core/database/DatabaseMigrationLoader"
);
const IdentityLinkError = require(
    "../../../src/modules/identity/IdentityLinkError"
);
const IdentityLinkStatus = require(
    "../../../src/modules/identity/IdentityLinkStatus"
);
const IdentityMigrations = require(
    "../../../src/modules/identity/persistence/IdentityMigrations"
);
const SqliteIdentityStore = require(
    "../../../src/modules/identity/persistence/SqliteIdentityStore"
);

function createDatabase(location = ":memory:") {
    const database = new DatabaseSync(location);

    database.exec("PRAGMA foreign_keys = ON");
    IdentityMigrations.forEach(
        migration => database.exec(migration.sql)
    );

    return database;
}

function createLink(overrides = {}) {
    return {
        discordUserId: "123456789012345678",
        gameUserId: "EOS_abc123",
        status: IdentityLinkStatus.PENDING,
        createdAt: "2026-07-31T01:00:00.000Z",
        verifiedAt: null,
        revokedAt: null,
        ...overrides
    };
}

test("loads identity migration after existing global migrations", () => {
    const migrations = DatabaseMigrationLoader.load();

    assert.equal(
        migrations.at(-1).id,
        "006_create_identity_links"
    );
    assert.deepEqual(
        migrations.map(migration => migration.id),
        [
            "001_create_moderation_audit",
            "002_create_economy_accounts",
            "003_create_ticket_aggregate",
            "004_create_settings_overrides",
            "005_create_settings_audit_history",
            "006_create_identity_links"
        ]
    );
});

test("stores and retrieves defensive identity links", () => {
    const database = createDatabase();
    const store = new SqliteIdentityStore(database);
    const created = store.createLink(createLink());

    assert.equal(created.id, "identity-link-1");
    created.status = IdentityLinkStatus.REVOKED;

    assert.equal(
        store.getLinkById(created.id).status,
        IdentityLinkStatus.PENDING
    );
    assert.notStrictEqual(store.listLinks()[0], created);

    database.close();
});

test("enforces active identity uniqueness", () => {
    const database = createDatabase();
    const store = new SqliteIdentityStore(database);

    store.createLink(createLink());

    assert.throws(
        () => store.createLink(createLink({
            gameUserId: "Steam_123"
        })),
        error =>
            error instanceof IdentityLinkError &&
            error.code ===
                IdentityLinkError.Code.DISCORD_CONFLICT
    );
    assert.throws(
        () => store.createLink(createLink({
            discordUserId: "223456789012345678"
        })),
        error =>
            error instanceof IdentityLinkError &&
            error.code === IdentityLinkError.Code.GAME_CONFLICT
    );

    database.close();
});

test("replaces links atomically and rolls back conflicts", () => {
    const database = createDatabase();
    const store = new SqliteIdentityStore(database);
    const current = store.createLink(createLink());

    store.createLink(createLink({
        discordUserId: "223456789012345678",
        gameUserId: "Steam_999"
    }));

    assert.throws(() => store.replaceLink(
        current,
        {
            ...current,
            status: IdentityLinkStatus.REVOKED,
            revokedAt: "2026-07-31T01:02:00.000Z"
        },
        createLink({ gameUserId: "Steam_999" })
    ));
    assert.equal(
        store.getLinkById(current.id).status,
        IdentityLinkStatus.PENDING
    );
    assert.equal(store.listLinks().length, 2);

    const replacement = store.replaceLink(
        current,
        {
            ...current,
            status: IdentityLinkStatus.REVOKED,
            revokedAt: "2026-07-31T01:02:00.000Z"
        },
        createLink({ gameUserId: "Steam_456" })
    );

    assert.equal(replacement.id, "identity-link-3");
    assert.equal(
        store.getLinkById(current.id).status,
        IdentityLinkStatus.REVOKED
    );

    database.close();
});

test("recovers identity links after reopening SQLite", () => {
    const directory = fs.mkdtempSync(
        path.join(os.tmpdir(), "rsf-identity-")
    );
    const location = path.join(directory, "identity.sqlite");

    try {
        let database = createDatabase(location);
        let store = new SqliteIdentityStore(database);
        const created = store.createLink(createLink());

        database.close();
        database = new DatabaseSync(location);
        store = new SqliteIdentityStore(database);

        assert.deepEqual(
            store.getLinkById(created.id),
            created
        );

        database.close();
    } finally {
        fs.rmSync(directory, {
            recursive: true,
            force: true
        });
    }
});
