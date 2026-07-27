const SettingsMigrations = Object.freeze([
    Object.freeze({
        id: "004_create_settings_overrides",
        sql: `
            CREATE TABLE settings_overrides (
                setting_key TEXT PRIMARY KEY CHECK (
                    length(trim(setting_key)) > 0
                ),
                value_type TEXT NOT NULL CHECK (
                    value_type IN ('INTEGER', 'STRING', 'BOOLEAN')
                ),
                serialized_value TEXT NOT NULL,
                updated_at TEXT NOT NULL CHECK (
                    length(trim(updated_at)) > 0
                ),
                updated_by TEXT NOT NULL CHECK (
                    length(trim(updated_by)) > 0
                )
            ) STRICT
        `
    }),
    Object.freeze({
        id: "005_create_settings_audit_history",
        sql: `
            CREATE TABLE settings_audit_history (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT NOT NULL CHECK (
                    length(trim(setting_key)) > 0
                ),
                action TEXT NOT NULL CHECK (
                    action IN ('UPDATE', 'RESET')
                ),
                previous_value_type TEXT CHECK (
                    previous_value_type IS NULL OR
                    previous_value_type IN ('INTEGER', 'STRING', 'BOOLEAN')
                ),
                previous_serialized_value TEXT,
                new_value_type TEXT CHECK (
                    new_value_type IS NULL OR
                    new_value_type IN ('INTEGER', 'STRING', 'BOOLEAN')
                ),
                new_serialized_value TEXT,
                actor_id TEXT NOT NULL CHECK (
                    length(trim(actor_id)) > 0
                ),
                occurred_at TEXT NOT NULL CHECK (
                    length(trim(occurred_at)) > 0
                ),
                CHECK (
                    (previous_value_type IS NULL) =
                    (previous_serialized_value IS NULL)
                ),
                CHECK (
                    (new_value_type IS NULL) =
                    (new_serialized_value IS NULL)
                )
            ) STRICT
        `
    })
]);

module.exports = SettingsMigrations;
