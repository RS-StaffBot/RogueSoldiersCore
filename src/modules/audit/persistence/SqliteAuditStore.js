class SqliteAuditStore {

    #insertRecord;
    #selectBySequence;
    #listAll;
    #listRecent;
    #countRecords;

    constructor(database) {

        if (!database) {
            throw new Error(
                "A database connection is required for Audit persistence."
            );
        }

        this.#insertRecord = database.prepare(`
            INSERT INTO audit_records (
                actor_type,
                actor_id,
                source,
                action,
                target_type,
                target_id,
                outcome,
                metadata,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        this.#selectBySequence = database.prepare(`
            SELECT
                sequence,
                actor_type AS actorType,
                actor_id AS actorId,
                source,
                action,
                target_type AS targetType,
                target_id AS targetId,
                outcome,
                metadata,
                created_at AS createdAt
            FROM audit_records
            WHERE sequence = ?
        `);
        this.#listAll = database.prepare(`
            SELECT
                sequence,
                actor_type AS actorType,
                actor_id AS actorId,
                source,
                action,
                target_type AS targetType,
                target_id AS targetId,
                outcome,
                metadata,
                created_at AS createdAt
            FROM audit_records
            ORDER BY sequence ASC
        `);
        this.#listRecent = database.prepare(`
            SELECT
                sequence,
                actor_type AS actorType,
                actor_id AS actorId,
                source,
                action,
                target_type AS targetType,
                target_id AS targetId,
                outcome,
                metadata,
                created_at AS createdAt
            FROM audit_records
            ORDER BY sequence DESC
            LIMIT ?
        `);
        this.#countRecords = database.prepare(`
            SELECT COUNT(*) AS count
            FROM audit_records
        `);

    }

    append(record) {

        try {

            const result = this.#insertRecord.run(
                record.actorType,
                record.actorId,
                record.source,
                record.action,
                record.targetType,
                record.targetId,
                record.outcome,
                JSON.stringify(record.metadata),
                record.createdAt
            );
            const sequence = this.validateSequence(
                result.lastInsertRowid
            );

            return this.mapRecord(
                this.#selectBySequence.get(sequence)
            );

        } catch (error) {

            if (error.message.startsWith("Audit ")) {
                throw error;
            }

            throw new Error("Audit storage failed.");

        }

    }

    getById(id) {

        const sequence = this.parseSequence(id);

        if (sequence === null) {
            return null;
        }

        const row = this.#selectBySequence.get(sequence);

        return row ? this.mapRecord(row) : null;

    }

    listAll() {
        return this.#listAll.all().map(
            row => this.mapRecord(row)
        );
    }

    listRecent(limit) {
        return this.#listRecent.all(limit).map(
            row => this.mapRecord(row)
        );
    }

    count() {

        const value = Number(
            this.#countRecords.get().count
        );

        if (!Number.isSafeInteger(value) || value < 0) {
            throw new Error("Audit record count is invalid.");
        }

        return value;

    }

    parseSequence(id) {

        if (typeof id !== "string") {
            return null;
        }

        const match = /^audit-([1-9]\d*)$/.exec(id);

        if (!match) {
            return null;
        }

        const sequence = Number(match[1]);

        return Number.isSafeInteger(sequence)
            ? sequence
            : null;

    }

    validateSequence(value) {

        const sequence = Number(value);

        if (
            !Number.isSafeInteger(sequence) ||
            sequence <= 0 ||
            sequence >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                "Audit record ID sequence has reached its safe limit."
            );
        }

        return sequence;

    }

    mapRecord(row) {

        const sequence = this.validateSequence(row.sequence);
        let metadata;

        try {
            metadata = JSON.parse(row.metadata);
        } catch (error) {
            throw new Error("Audit stored metadata is invalid.");
        }

        return {
            id: `audit-${sequence}`,
            actorType: row.actorType,
            actorId: row.actorId,
            source: row.source,
            action: row.action,
            targetType: row.targetType,
            targetId: row.targetId,
            outcome: row.outcome,
            metadata,
            createdAt: row.createdAt
        };

    }

}

module.exports = SqliteAuditStore;
