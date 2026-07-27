const SettingsMigrations = Object.freeze([
    Object.freeze({
        id: "004_create_settings_overrides",
        sql: `
            CREATE TABLE settings_overrides (
                setting_key TEXT PRIMARY KEY CHECK (
                    length(trim(setting_key)) > 0
                ),
                value_type TEXT NOT NULL CHECK (
                    value_type IN ('INTEGER', 'STRING')
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
    })
]);

module.exports = SettingsMigrations;
