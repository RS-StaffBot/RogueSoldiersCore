const {
    AuditActorType,
    AuditOutcome,
    AuditSource
} = require("../AuditContract");
const AuditRecord = require("../AuditRecord");

class AuditQueryPolicy {

    static allowedFilterFields = Object.freeze([
        "actorType",
        "source",
        "action",
        "targetType",
        "outcome"
    ]);

    static createFilters(filters = {}) {
        if (
            !filters ||
            typeof filters !== "object" ||
            Array.isArray(filters) ||
            ![
                Object.prototype,
                null
            ].includes(Object.getPrototypeOf(filters))
        ) {
            throw new Error("Audit query filters must be a plain object.");
        }

        const snapshot = {};

        for (const key of Reflect.ownKeys(filters)) {
            if (
                typeof key !== "string" ||
                !this.allowedFilterFields.includes(key)
            ) {
                throw new Error("Audit query filter is unsupported.");
            }

            const value = filters[key];

            if (
                key === "actorType" &&
                !Object.values(AuditActorType).includes(value)
            ) {
                throw new Error("Audit query actor type is invalid.");
            }

            if (
                key === "source" &&
                !Object.values(AuditSource).includes(value)
            ) {
                throw new Error("Audit query source is invalid.");
            }

            if (
                key === "outcome" &&
                !Object.values(AuditOutcome).includes(value)
            ) {
                throw new Error("Audit query outcome is invalid.");
            }

            if (key === "action") {
                snapshot[key] = AuditRecord.validateRequiredString(
                    value,
                    "query action",
                    64
                );
                continue;
            }

            if (key === "targetType") {
                snapshot[key] = AuditRecord.validateRequiredString(
                    value,
                    "query target type",
                    64
                );
                continue;
            }

            snapshot[key] = value;
        }

        return Object.freeze(snapshot);
    }

    static encodeCursor(sequence) {
        if (!Number.isSafeInteger(sequence) || sequence <= 0) {
            throw new Error("Audit continuation cursor is invalid.");
        }

        return Buffer.from(
            JSON.stringify({ before: sequence }),
            "utf8"
        ).toString("base64url");
    }

    static decodeCursor(cursor) {
        if (cursor === null || cursor === undefined) {
            return null;
        }

        if (
            typeof cursor !== "string" ||
            cursor.length === 0 ||
            cursor.length > 128 ||
            !/^[A-Za-z0-9_-]+$/.test(cursor)
        ) {
            throw new Error("Audit continuation cursor is invalid.");
        }

        try {
            const value = JSON.parse(
                Buffer.from(cursor, "base64url").toString("utf8")
            );

            if (
                !value ||
                Object.getPrototypeOf(value) !== Object.prototype ||
                Reflect.ownKeys(value).length !== 1 ||
                !Number.isSafeInteger(value.before) ||
                value.before <= 0
            ) {
                throw new Error();
            }

            return value.before;
        } catch (error) {
            throw new Error("Audit continuation cursor is invalid.");
        }
    }

}

module.exports = AuditQueryPolicy;
