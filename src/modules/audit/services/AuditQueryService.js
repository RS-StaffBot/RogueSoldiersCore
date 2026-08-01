const AuditQueryPolicy = require("./AuditQueryPolicy");

class AuditQueryService {

    constructor({
        auditModule,
        defaultLimit = 25,
        maximumLimit = 100
    }) {
        if (
            !auditModule ||
            typeof auditModule.queryRecords !== "function" ||
            typeof auditModule.getRecord !== "function"
        ) {
            throw new Error("Audit query service requires an Audit Module.");
        }

        this.validateLimit(defaultLimit, "default");
        this.validateLimit(maximumLimit, "maximum");

        if (defaultLimit > maximumLimit) {
            throw new Error(
                "Audit query default limit cannot exceed the maximum."
            );
        }

        this.getById = id => {
            try {
                return auditModule.getRecord(id);
            } catch (error) {
                throw new Error("Audit query failed.");
            }
        };

        this.list = ({
            limit = defaultLimit,
            cursor = null,
            filters = {}
        } = {}) => {
            try {
                this.validateLimit(limit, "requested");

                if (limit > maximumLimit) {
                    throw new Error();
                }

                const beforeSequence =
                    AuditQueryPolicy.decodeCursor(cursor);
                const safeFilters =
                    AuditQueryPolicy.createFilters(filters);
                const records = auditModule.queryRecords({
                    beforeSequence,
                    limit: limit + 1,
                    filters: safeFilters
                });
                const hasMore = records.length > limit;
                const pageRecords = records.slice(0, limit);
                const lastRecord = pageRecords.at(-1);
                const nextCursor = hasMore && lastRecord
                    ? AuditQueryPolicy.encodeCursor(
                        Number(lastRecord.id.slice(6))
                    )
                    : null;

                return Object.freeze({
                    records: Object.freeze(pageRecords),
                    nextCursor
                });
            } catch (error) {
                throw new Error("Audit query failed.");
            }
        };

        Object.freeze(this);
    }

    validateLimit(limit, fieldName) {
        if (!Number.isSafeInteger(limit) || limit <= 0) {
            throw new Error(
                `Audit query ${fieldName} limit is invalid.`
            );
        }
    }

}

module.exports = AuditQueryService;
