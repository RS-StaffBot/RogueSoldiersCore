const AuditMigrations = Object.freeze([
    Object.freeze({
        id: "007_create_audit_records",
        sql: `
            CREATE TABLE audit_records (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_type TEXT NOT NULL CHECK (
                    actor_type IN (
                        'discord-user',
                        'system',
                        'website-user'
                    )
                ),
                actor_id TEXT NOT NULL CHECK (
                    length(trim(actor_id)) BETWEEN 1 AND 128
                ),
                source TEXT NOT NULL CHECK (
                    source IN ('discord', 'framework', 'website')
                ),
                action TEXT NOT NULL CHECK (
                    length(trim(action)) BETWEEN 1 AND 64
                ),
                target_type TEXT NOT NULL CHECK (
                    length(trim(target_type)) BETWEEN 1 AND 64
                ),
                target_id TEXT NOT NULL CHECK (
                    length(trim(target_id)) BETWEEN 1 AND 128
                ),
                outcome TEXT NOT NULL CHECK (
                    outcome IN ('denied', 'failed', 'success')
                ),
                metadata TEXT NOT NULL CHECK (
                    json_valid(metadata) AND
                    json_type(metadata) = 'object'
                ),
                created_at TEXT NOT NULL CHECK (
                    length(trim(created_at)) > 0
                )
            ) STRICT;

            CREATE INDEX audit_records_recent
            ON audit_records(sequence DESC)
        `
    })
]);

module.exports = AuditMigrations;
