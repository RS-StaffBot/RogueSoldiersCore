class ModerationAuditRecord {

    static createDetailsSnapshot(details) {

        if (!this.isPlainObject(details)) {
            throw new Error(
                "Moderation details must be a plain object."
            );
        }

        return this.cloneJsonValue(
            details,
            new WeakSet()
        );

    }

    static cloneJsonValue(value, ancestors) {

        if (
            value === null ||
            typeof value === "string" ||
            typeof value === "boolean"
        ) {
            return value;
        }

        if (typeof value === "number") {

            if (
                !Number.isFinite(value) ||
                Object.is(value, -0)
            ) {
                throw new Error(
                    "Moderation details must contain only " +
                    "JSON-compatible values."
                );
            }

            return value;

        }

        if (
            typeof value !== "object" ||
            (
                !Array.isArray(value) &&
                !this.isPlainObject(value)
            )
        ) {
            throw new Error(
                "Moderation details must contain only " +
                "JSON-compatible values."
            );
        }

        if (ancestors.has(value)) {
            throw new Error(
                "Moderation details cannot contain cyclic values."
            );
        }

        ancestors.add(value);

        try {

            if (Array.isArray(value)) {
                return this.cloneJsonArray(
                    value,
                    ancestors
                );
            }

            return this.cloneJsonObject(
                value,
                ancestors
            );

        } finally {
            ancestors.delete(value);
        }

    }

    static cloneJsonArray(value, ancestors) {

        const ownKeys = Reflect.ownKeys(value);

        if (ownKeys.length !== value.length + 1) {
            throw new Error(
                "Moderation details arrays must be dense " +
                "and contain only indexed values."
            );
        }

        const clone = [];

        for (let index = 0; index < value.length; index += 1) {

            const descriptor = Object.getOwnPropertyDescriptor(
                value,
                String(index)
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
                    "Moderation details arrays must be dense " +
                    "and contain only indexed values."
                );
            }

            clone.push(
                this.cloneJsonValue(
                    descriptor.value,
                    ancestors
                )
            );

        }

        return Object.freeze(clone);

    }

    static cloneJsonObject(value, ancestors) {

        const ownKeys = Reflect.ownKeys(value);
        const clone = {};

        for (const key of ownKeys) {

            if (typeof key !== "string") {
                throw new Error(
                    "Moderation details objects must use " +
                    "enumerable string data properties."
                );
            }

            const descriptor = Object.getOwnPropertyDescriptor(
                value,
                key
            );

            if (
                !descriptor.enumerable ||
                !Object.prototype.hasOwnProperty.call(
                    descriptor,
                    "value"
                )
            ) {
                throw new Error(
                    "Moderation details objects must use " +
                    "enumerable string data properties."
                );
            }

            Object.defineProperty(
                clone,
                key,
                {
                    configurable: false,
                    enumerable: true,
                    value: this.cloneJsonValue(
                        descriptor.value,
                        ancestors
                    ),
                    writable: false
                }
            );

        }

        return Object.freeze(clone);

    }

    static isPlainObject(value) {

        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);

        return (
            prototype === Object.prototype ||
            prototype === null
        );

    }

    constructor({
        action,
        guildId,
        moderatorId,
        targetId = null,
        reason,
        details = {},
        createdAt = new Date()
    }) {

        if (
            typeof action !== "string" ||
            action.trim().length === 0
        ) {
            throw new Error(
                "A moderation action is required."
            );
        }

        if (
            typeof guildId !== "string" ||
            guildId.trim().length === 0
        ) {
            throw new Error(
                "A guild ID is required."
            );
        }

        if (
            typeof moderatorId !== "string" ||
            moderatorId.trim().length === 0
        ) {
            throw new Error(
                "A moderator ID is required."
            );
        }

        if (
            typeof reason !== "string" ||
            reason.trim().length === 0
        ) {
            throw new Error(
                "A moderation reason is required."
            );
        }

        if (
            targetId !== null &&
            (
                typeof targetId !== "string" ||
                targetId.trim().length === 0
            )
        ) {
            throw new Error(
                "The target ID must be a non-empty string or null."
            );
        }

        if (
            !(createdAt instanceof Date) ||
            Number.isNaN(createdAt.getTime())
        ) {
            throw new Error(
                "Moderation audit creation date is invalid."
            );
        }

        this.action = action;
        this.guildId = guildId;
        this.moderatorId = moderatorId;
        this.targetId = targetId;
        this.reason = reason.trim();
        this.details =
            ModerationAuditRecord
                .createDetailsSnapshot(details);
        this.createdAt = createdAt.toISOString();

        Object.freeze(this);

    }

}

module.exports = ModerationAuditRecord;
