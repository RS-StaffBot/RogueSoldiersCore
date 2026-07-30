const MAXIMUM_REASON_LENGTH = 200;

class DiscordGamePlayerTargetValidator {

    validateOnlineEntityId(value) {

        if (
            typeof value !== "string" ||
            !/^[1-9]\d*$/u.test(value)
        ) {
            return this.invalid(
                "The player entity ID must be a positive whole number."
            );
        }

        const entityId = Number.parseInt(value, 10);

        if (!Number.isSafeInteger(entityId)) {
            return this.invalid(
                "The player entity ID is outside the supported range."
            );
        }

        return Object.freeze({
            valid: true,
            value: entityId
        });

    }

    validateReason(value) {

        if (
            typeof value !== "string" ||
            value.length < 1 ||
            value.length > MAXIMUM_REASON_LENGTH ||
            value.trim() !== value ||
            /["\\\u0000-\u001f\u007f]/u.test(value)
        ) {
            return this.invalid(
                "The reason must be 1-200 characters and cannot contain quotes, backslashes, or control characters."
            );
        }

        return Object.freeze({
            valid: true,
            value
        });

    }

    invalid(message) {
        return Object.freeze({
            message,
            valid: false,
            value: null
        });
    }

}

module.exports = DiscordGamePlayerTargetValidator;
