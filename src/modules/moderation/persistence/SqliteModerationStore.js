const ModerationAuditRecord = require(
    "../ModerationAuditRecord"
);

class SqliteModerationStore {

    #insertRecord;
    #listRecords;
    #countRecords;

    constructor(database) {

        if (!database) {
            throw new Error(
                "A database connection is required for " +
                "Moderation persistence."
            );
        }

        this.#insertRecord = database.prepare(`
            INSERT INTO moderation_audit_records (
                action,
                guild_id,
                moderator_id,
                target_id,
                reason,
                details_json,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        this.#listRecords = database.prepare(`
            SELECT
                action,
                guild_id AS guildId,
                moderator_id AS moderatorId,
                target_id AS targetId,
                reason,
                details_json AS detailsJson,
                created_at AS createdAt
            FROM moderation_audit_records
            ORDER BY sequence ASC
        `);
        this.#countRecords = database.prepare(`
            SELECT COUNT(*) AS count
            FROM moderation_audit_records
        `);

    }

    append(record) {

        const details =
            ModerationAuditRecord
                .createDetailsSnapshot(record.details);

        try {

            this.#insertRecord.run(
                record.action,
                record.guildId,
                record.moderatorId,
                record.targetId,
                record.reason,
                JSON.stringify(details),
                record.createdAt
            );

        } catch (error) {
            throw new Error(
                "Moderation audit storage failed."
            );
        }

    }

    list() {

        return this.#listRecords.all().map(row => {

            let details;

            try {
                details = JSON.parse(row.detailsJson);
            } catch (error) {
                throw new Error(
                    "Stored moderation details are invalid."
                );
            }

            try {
                details =
                    ModerationAuditRecord
                        .createDetailsSnapshot(details);
            } catch (error) {
                throw new Error(
                    "Stored moderation details are invalid."
                );
            }

            return {
                action: row.action,
                guildId: row.guildId,
                moderatorId: row.moderatorId,
                targetId: row.targetId,
                reason: row.reason,
                details,
                createdAt: row.createdAt
            };

        });

    }

    count() {
        return this.#countRecords.get().count;
    }

}

module.exports = SqliteModerationStore;
