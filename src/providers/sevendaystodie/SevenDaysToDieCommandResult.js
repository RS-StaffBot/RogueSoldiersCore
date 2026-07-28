const SevenDaysToDieCommandCompletionReason = require(
    "./SevenDaysToDieCommandCompletionReason"
);
const SevenDaysToDieCommandStatus = require(
    "./SevenDaysToDieCommandStatus"
);

class SevenDaysToDieCommandResult {

    constructor({
        command,
        status,
        responseLines = [],
        eventLines = [],
        startedAt,
        completedAt,
        completionReason,
        truncated = false
    } = {}) {

        this.validateText(command, "command");

        if (!Object.values(SevenDaysToDieCommandStatus).includes(status)) {
            throw new Error("7 Days to Die command status is invalid.");
        }

        if (
            !Object.values(SevenDaysToDieCommandCompletionReason)
                .includes(completionReason)
        ) {
            throw new Error(
                "7 Days to Die command completion reason is invalid."
            );
        }

        const normalizedStartedAt = this.validateTimestamp(
            startedAt,
            "start"
        );
        const normalizedCompletedAt = this.validateTimestamp(
            completedAt,
            "completion"
        );

        if (
            Date.parse(normalizedCompletedAt) <
            Date.parse(normalizedStartedAt)
        ) {
            throw new Error(
                "7 Days to Die command completion cannot precede its start."
            );
        }

        if (typeof truncated !== "boolean") {
            throw new Error(
                "7 Days to Die command truncation state must be boolean."
            );
        }

        this.command = command;
        this.status = status;
        this.responseLines = this.copyLines(
            responseLines,
            "response"
        );
        this.eventLines = this.copyLines(eventLines, "event");
        this.startedAt = normalizedStartedAt;
        this.completedAt = normalizedCompletedAt;
        this.completionReason = completionReason;
        this.truncated = truncated;

        Object.freeze(this);

    }

    validateText(value, fieldName) {

        if (
            typeof value !== "string" ||
            value.trim().length === 0 ||
            value !== value.trim()
        ) {
            throw new Error(
                `7 Days to Die ${fieldName} must be a non-empty ` +
                "trimmed string."
            );
        }

    }

    validateTimestamp(value, fieldName) {

        this.validateText(value, `${fieldName} timestamp`);

        const parsed = Date.parse(value);

        if (Number.isNaN(parsed)) {
            throw new Error(
                `7 Days to Die command ${fieldName} timestamp is invalid.`
            );
        }

        return new Date(parsed).toISOString();

    }

    copyLines(lines, fieldName) {

        if (
            !Array.isArray(lines) ||
            lines.some(line => typeof line !== "string")
        ) {
            throw new Error(
                `7 Days to Die command ${fieldName} lines are invalid.`
            );
        }

        return Object.freeze([...lines]);

    }

}

module.exports = SevenDaysToDieCommandResult;
