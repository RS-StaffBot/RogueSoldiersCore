const ModerationMigrations = Object.freeze([
    Object.freeze({
        id: "001_create_moderation_audit_records",
        sql: `
            CREATE TABLE moderation_audit_records (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL CHECK (
                    action IN (
                        'BAN',
                        'KICK',
                        'WARN',
                        'TIMEOUT',
                        'UNTIMEOUT',
                        'PURGE'
                    )
                ),
                guild_id TEXT NOT NULL CHECK (
                    length(trim(guild_id)) > 0
                ),
                moderator_id TEXT NOT NULL CHECK (
                    length(trim(moderator_id)) > 0
                ),
                target_id TEXT CHECK (
                    target_id IS NULL OR
                    length(trim(target_id)) > 0
                ),
                reason TEXT NOT NULL CHECK (
                    length(trim(reason)) > 0
                ),
                details_json TEXT NOT NULL CHECK (
                    json_valid(details_json) AND
                    json_type(details_json) = 'object'
                ),
                created_at TEXT NOT NULL CHECK (
                    length(trim(created_at)) > 0
                )
            ) STRICT
        `
    })
]);

module.exports = ModerationMigrations;
