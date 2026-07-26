class DatabaseMigrationManager {

    constructor(database, clock = () => new Date()) {

        if (!database) {
            throw new Error(
                "A database connection is required."
            );
        }

        if (typeof clock !== "function") {
            throw new Error(
                "Database migration clock must be a function."
            );
        }

        this.database = database;
        this.clock = clock;

    }

    ensureHistoryTable() {

        this.database.exec(`
            CREATE TABLE IF NOT EXISTS rsf_schema_migrations (
                id TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            ) STRICT
        `);

    }

    validateMigrations(migrations) {

        if (!Array.isArray(migrations)) {
            throw new Error(
                "Database migrations must be an array."
            );
        }

        const migrationIds = new Set();

        for (const migration of migrations) {

            if (
                !migration ||
                typeof migration !== "object"
            ) {
                throw new Error(
                    "Each database migration must be an object."
                );
            }

            if (
                typeof migration.id !== "string" ||
                !/^\d{3}_[a-z0-9_]+$/.test(migration.id)
            ) {
                throw new Error(
                    "Database migration IDs must use the " +
                    "NNN_lowercase_name format."
                );
            }

            if (migrationIds.has(migration.id)) {
                throw new Error(
                    `Duplicate database migration ID: ${migration.id}`
                );
            }

            if (
                typeof migration.sql !== "string" ||
                migration.sql.trim().length === 0
            ) {
                throw new Error(
                    `Database migration SQL is required: ${migration.id}`
                );
            }

            migrationIds.add(migration.id);

        }

    }

    listApplied() {

        this.ensureHistoryTable();

        const rows = this.database.prepare(`
            SELECT
                id,
                applied_at AS appliedAt
            FROM rsf_schema_migrations
            ORDER BY id ASC
        `).all();

        return Object.freeze(
            rows.map(row =>
                Object.freeze({
                    id: row.id,
                    appliedAt: row.appliedAt
                })
            )
        );

    }

    apply(migrations) {

        this.validateMigrations(migrations);
        this.ensureHistoryTable();

        const orderedMigrations = [...migrations].sort(
            (firstMigration, secondMigration) =>
                firstMigration.id.localeCompare(
                    secondMigration.id
                )
        );
        const appliedIds = new Set(
            this.listApplied().map(migration =>
                migration.id
            )
        );
        const insertMigration = this.database.prepare(`
            INSERT INTO rsf_schema_migrations (
                id,
                applied_at
            ) VALUES (?, ?)
        `);

        for (const migration of orderedMigrations) {

            if (appliedIds.has(migration.id)) {
                continue;
            }

            this.applyMigration(
                migration,
                insertMigration
            );

            appliedIds.add(migration.id);

        }

        return this.listApplied();

    }

    applyMigration(migration, insertMigration) {

        this.database.exec("BEGIN IMMEDIATE");

        try {

            this.database.exec(migration.sql);
            insertMigration.run(
                migration.id,
                this.clock().toISOString()
            );
            this.database.exec("COMMIT");

        } catch (error) {

            try {
                this.database.exec("ROLLBACK");
            } catch (rollbackError) {
                throw new Error(
                    "Database migration rollback failed: " +
                    `${migration.id}.`
                );
            }

            throw new Error(
                `Database migration failed: ${migration.id}.`
            );

        }

    }

}

module.exports = DatabaseMigrationManager;
