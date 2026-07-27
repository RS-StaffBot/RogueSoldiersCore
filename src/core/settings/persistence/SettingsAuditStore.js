const SettingValueType = require("../SettingValueType");

class SettingsAuditStore {

    constructor(database) {

        if (
            !database ||
            typeof database.prepare !== "function" ||
            typeof database.exec !== "function"
        ) {
            throw new Error("Settings audit store requires a database connection.");
        }

        this.database = database;
        this.insertStatement = database.prepare(`
            INSERT INTO settings_audit_history (
                setting_key,
                action,
                previous_value_type,
                previous_serialized_value,
                new_value_type,
                new_serialized_value,
                actor_id,
                occurred_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

    }

    serialize(record) {

        if (!record) {
            return { valueType: null, serializedValue: null };
        }

        if (!Object.values(SettingValueType).includes(record.valueType)) {
            throw new Error("Settings audit value type is invalid.");
        }

        return {
            valueType: record.valueType,
            serializedValue: JSON.stringify(record.value)
        };

    }

    runTransaction(operation) {

        if (typeof operation !== "function") {
            throw new Error("Settings audit transaction operation is invalid.");
        }

        this.database.exec("BEGIN IMMEDIATE");

        try {
            const result = operation();
            this.database.exec("COMMIT");
            return result;
        } catch (error) {
            this.database.exec("ROLLBACK");
            throw error;
        }

    }

    record({
        settingKey,
        action,
        previousRecord = null,
        newRecord = null,
        actorId,
        occurredAt
    }) {

        const previous = this.serialize(previousRecord);
        const next = this.serialize(newRecord);

        const result = this.insertStatement.run(
            settingKey,
            action,
            previous.valueType,
            previous.serializedValue,
            next.valueType,
            next.serializedValue,
            actorId,
            occurredAt
        );

        return Number(result.lastInsertRowid);

    }

    listHistory({ settingKey = null, limit = 50, beforeSequence = null } = {}) {

        if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 100) {
            throw new Error("Settings audit history limit must be between 1 and 100.");
        }

        if (
            beforeSequence !== null &&
            (!Number.isSafeInteger(beforeSequence) || beforeSequence <= 0)
        ) {
            throw new Error("Settings audit before sequence is invalid.");
        }

        if (
            settingKey !== null &&
            (typeof settingKey !== "string" || settingKey.trim().length === 0)
        ) {
            throw new Error("Settings audit setting key is invalid.");
        }

        const clauses = [];
        const values = [];

        if (settingKey !== null) {
            clauses.push("setting_key = ?");
            values.push(settingKey);
        }

        if (beforeSequence !== null) {
            clauses.push("sequence < ?");
            values.push(beforeSequence);
        }

        const where = clauses.length > 0
            ? `WHERE ${clauses.join(" AND ")}`
            : "";

        const rows = this.database.prepare(`
            SELECT
                sequence,
                setting_key AS settingKey,
                action,
                previous_value_type AS previousValueType,
                previous_serialized_value AS previousSerializedValue,
                new_value_type AS newValueType,
                new_serialized_value AS newSerializedValue,
                actor_id AS actorId,
                occurred_at AS occurredAt
            FROM settings_audit_history
            ${where}
            ORDER BY sequence DESC
            LIMIT ?
        `).all(...values, limit);

        return Object.freeze(rows.map(row => Object.freeze({
            sequence: row.sequence,
            settingKey: row.settingKey,
            action: row.action,
            previousValueType: row.previousValueType,
            previousValue: row.previousSerializedValue === null
                ? null
                : JSON.parse(row.previousSerializedValue),
            newValueType: row.newValueType,
            newValue: row.newSerializedValue === null
                ? null
                : JSON.parse(row.newSerializedValue),
            actorId: row.actorId,
            occurredAt: row.occurredAt
        })));

    }

}

module.exports = SettingsAuditStore;
