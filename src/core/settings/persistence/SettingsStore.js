const SettingValueType = require("../SettingValueType");

class SettingsStore {

    constructor(database) {

        if (!database || typeof database.prepare !== "function") {
            throw new Error("Settings store requires a database connection.");
        }

        this.database = database;
        this.upsertStatement = database.prepare(`
            INSERT INTO settings_overrides (
                setting_key,
                value_type,
                serialized_value,
                updated_at,
                updated_by
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(setting_key) DO UPDATE SET
                value_type = excluded.value_type,
                serialized_value = excluded.serialized_value,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
        `);
        this.getStatement = database.prepare(`
            SELECT
                setting_key AS settingKey,
                value_type AS valueType,
                serialized_value AS serializedValue,
                updated_at AS updatedAt,
                updated_by AS updatedBy
            FROM settings_overrides
            WHERE setting_key = ?
        `);
        this.listStatement = database.prepare(`
            SELECT
                setting_key AS settingKey,
                value_type AS valueType,
                serialized_value AS serializedValue,
                updated_at AS updatedAt,
                updated_by AS updatedBy
            FROM settings_overrides
            ORDER BY setting_key ASC
        `);
        this.deleteStatement = database.prepare(`
            DELETE FROM settings_overrides
            WHERE setting_key = ?
        `);

    }

    validateText(value, fieldName) {

        if (
            typeof value !== "string" ||
            value.trim().length === 0 ||
            value !== value.trim()
        ) {
            throw new Error(
                `Settings ${fieldName} must be a non-empty trimmed string.`
            );
        }

    }

    validateValue(valueType, value) {

        if (!Object.values(SettingValueType).includes(valueType)) {
            throw new Error(`Unsupported setting value type: ${valueType}`);
        }

        if (
            valueType === SettingValueType.INTEGER &&
            (
                typeof value !== "number" ||
                !Number.isSafeInteger(value)
            )
        ) {
            throw new Error("Settings INTEGER value must be a safe integer.");
        }

        if (
            valueType === SettingValueType.STRING &&
            typeof value !== "string"
        ) {
            throw new Error("Settings STRING value must be a string.");
        }

    }

    serialize(valueType, value) {

        this.validateValue(valueType, value);
        return JSON.stringify(value);

    }

    deserialize(valueType, serializedValue) {

        let value;

        try {
            value = JSON.parse(serializedValue);
        } catch (error) {
            throw new Error("Stored setting value is corrupt.");
        }

        this.validateValue(valueType, value);
        return value;

    }

    createSnapshot(row) {

        if (!row) {
            return null;
        }

        return Object.freeze({
            settingKey: row.settingKey,
            valueType: row.valueType,
            value: this.deserialize(
                row.valueType,
                row.serializedValue
            ),
            updatedAt: row.updatedAt,
            updatedBy: row.updatedBy
        });

    }

    save({
        settingKey,
        valueType,
        value,
        updatedAt,
        updatedBy
    } = {}) {

        this.validateText(settingKey, "key");
        this.validateText(updatedAt, "updated timestamp");
        this.validateText(updatedBy, "actor");

        if (Number.isNaN(Date.parse(updatedAt))) {
            throw new Error("Settings updated timestamp must be valid ISO text.");
        }

        const serializedValue = this.serialize(valueType, value);

        this.upsertStatement.run(
            settingKey,
            valueType,
            serializedValue,
            updatedAt,
            updatedBy
        );

        return this.get(settingKey);

    }

    get(settingKey) {

        this.validateText(settingKey, "key");
        return this.createSnapshot(this.getStatement.get(settingKey));

    }

    list() {

        return Object.freeze(
            this.listStatement.all().map(row => this.createSnapshot(row))
        );

    }

    delete(settingKey) {

        this.validateText(settingKey, "key");
        return this.deleteStatement.run(settingKey).changes > 0;

    }

}

module.exports = SettingsStore;
