const {
    AuditActorType,
    AuditMetadataField,
    AuditOutcome,
    AuditSource
} = require("./AuditContract");

class AuditRecord {

    static validateRequiredString(value, fieldName, maximumLength) {

        if (
            typeof value !== "string" ||
            value.trim().length === 0 ||
            value.length > maximumLength
        ) {
            throw new Error(
                `Audit ${fieldName} must be a non-empty string ` +
                `no longer than ${maximumLength} characters.`
            );
        }

        return value.trim();

    }

    static createMetadataSnapshot(metadata) {

        if (
            !metadata ||
            typeof metadata !== "object" ||
            Array.isArray(metadata) ||
            ![
                Object.prototype,
                null
            ].includes(Object.getPrototypeOf(metadata))
        ) {
            throw new Error(
                "Audit metadata must be a plain object."
            );
        }

        const allowedFields = new Set(
            Object.values(AuditMetadataField)
        );
        const keys = Reflect.ownKeys(metadata);

        if (keys.length > allowedFields.size) {
            throw new Error(
                "Audit metadata contains too many fields."
            );
        }

        const snapshot = {};

        for (const key of keys) {

            if (
                typeof key !== "string" ||
                !allowedFields.has(key)
            ) {
                throw new Error(
                    "Audit metadata contains an unsupported field."
                );
            }

            const descriptor = Object.getOwnPropertyDescriptor(
                metadata,
                key
            );

            if (
                !descriptor ||
                !descriptor.enumerable ||
                !Object.prototype.hasOwnProperty.call(
                    descriptor,
                    "value"
                )
            ) {
                throw new Error(
                    "Audit metadata must use enumerable data fields."
                );
            }

            snapshot[key] = this.validateRequiredString(
                descriptor.value,
                `metadata field ${key}`,
                128
            );

        }

        return Object.freeze(snapshot);

    }

    static createDraft(data) {
        return this.createSnapshot({
            ...data,
            id: null
        });
    }

    static createSnapshot({
        id,
        actorType,
        actorId,
        source,
        action,
        targetType,
        targetId,
        outcome,
        metadata = {},
        createdAt
    }) {

        if (
            id !== null &&
            (
                typeof id !== "string" ||
                !/^audit-[1-9]\d*$/.test(id)
            )
        ) {
            throw new Error("Audit record ID is invalid.");
        }

        if (!Object.values(AuditActorType).includes(actorType)) {
            throw new Error("Audit actor type is invalid.");
        }

        if (!Object.values(AuditSource).includes(source)) {
            throw new Error("Audit source is invalid.");
        }

        if (!Object.values(AuditOutcome).includes(outcome)) {
            throw new Error("Audit outcome is invalid.");
        }

        if (
            !(createdAt instanceof Date) ||
            Number.isNaN(createdAt.getTime())
        ) {
            throw new Error("Audit creation date is invalid.");
        }

        return Object.freeze({
            id,
            actorType,
            actorId: this.validateRequiredString(
                actorId,
                "actor ID",
                128
            ),
            source,
            action: this.validateRequiredString(
                action,
                "action",
                64
            ),
            targetType: this.validateRequiredString(
                targetType,
                "target type",
                64
            ),
            targetId: this.validateRequiredString(
                targetId,
                "target ID",
                128
            ),
            outcome,
            metadata: this.createMetadataSnapshot(metadata),
            createdAt: createdAt.toISOString()
        });

    }

    constructor(data) {
        Object.assign(
            this,
            AuditRecord.createSnapshot(data)
        );

        Object.freeze(this);
    }

}

module.exports = AuditRecord;
