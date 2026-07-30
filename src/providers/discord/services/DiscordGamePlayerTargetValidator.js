const MAXIMUM_DISPLAY_NAME_LENGTH = 40;
const MAXIMUM_REASON_LENGTH = 200;
const DURABLE_USER_ID_PATTERN =
    /^(?:Steam_[1-9]\d{0,19}|EOS_[A-Za-z0-9]{16,64})$/u;
const VALID_BAN_UNITS = Object.freeze([
    "minutes",
    "hours",
    "days",
    "weeks",
    "months",
    "years"
]);

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

    validateDurableUserId(value) {

        if (
            typeof value !== "string" ||
            !DURABLE_USER_ID_PATTERN.test(value)
        ) {
            return this.invalid(
                "The durable player ID must be a combined Steam_ or EOS_ identifier."
            );
        }

        return Object.freeze({
            valid: true,
            value
        });

    }

    validateDuration(value) {

        if (!Number.isSafeInteger(value) || value < 1) {
            return this.invalid(
                "The ban duration must be a positive whole number."
            );
        }

        return Object.freeze({
            valid: true,
            value
        });

    }

    validateBanUnit(value) {

        if (!VALID_BAN_UNITS.includes(value)) {
            return this.invalid(
                "The ban duration unit is not supported."
            );
        }

        return Object.freeze({
            valid: true,
            value
        });

    }

    validateDisplayName(value) {

        if (
            typeof value !== "string" ||
            value.length < 1 ||
            value.length > MAXIMUM_DISPLAY_NAME_LENGTH ||
            value.trim() !== value ||
            /["\\\u0000-\u001f\u007f]/u.test(value)
        ) {
            return this.invalid(
                "The display name must be 1-40 characters and cannot contain quotes, backslashes, or control characters."
            );
        }

        return Object.freeze({
            valid: true,
            value
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
