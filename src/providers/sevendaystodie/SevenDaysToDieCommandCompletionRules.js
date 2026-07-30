const SevenDaysToDieCommandCompletionReason = require(
    "./SevenDaysToDieCommandCompletionReason"
);

const INVALID_COMMAND_PATTERN =
    /^\*\*\* ERROR: unknown command '(?:[^']+)'$/u;
const GET_TIME_PATTERN = /^Day \d+, \d{2}:\d{2}$/u;
const LIST_PLAYERS_PATTERN = /^Total of \d+ in the game$/u;
const HELP_DESCRIPTION_PATTERN = /^Description:\s+.+$/u;
const KICK_SUCCESS_PATTERN = /^Kicking Player .+: .+$/u;
const KICK_INVALID_TARGET_PATTERN =
    /^"[^"]+" is not a valid entity id, player name or user id\.$/u;
const BAN_ADD_SUCCESS_PATTERN =
    /^\S+ banned until \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}, reason: .+\.$/u;
const BAN_ADD_INVALID_TARGET_PATTERN =
    /^"[^"]+" is not a valid entity id, player name or user id\.$/u;
const BAN_REMOVE_SUCCESS_PATTERN =
    /^\S+ removed from ban list\.$/u;

class SevenDaysToDieCommandCompletionRules {

    createDecider(command) {

        this.validateCommand(command);

        const normalizedCommand = command.toLowerCase();
        const commandParts = normalizedCommand.split(/\s+/u);
        const commandName = commandParts[0];
        const commandAction = commandParts[1] ?? null;
        const sayMessage = commandName === "say"
            ? this.extractSayMessage(command)
            : null;
        let helpDescriptionSeen = false;

        return ({ latestLine }) => {

            if (typeof latestLine !== "string") {
                throw new Error(
                    "7 Days to Die completion line must be a string."
                );
            }

            if (INVALID_COMMAND_PATTERN.test(latestLine)) {
                return this.complete(
                    SevenDaysToDieCommandCompletionReason.INVALID_COMMAND
                );
            }

            if (
                commandName === "gettime" &&
                GET_TIME_PATTERN.test(latestLine)
            ) {
                return this.complete(
                    SevenDaysToDieCommandCompletionReason.MATCHED_RULE
                );
            }

            if (
                (commandName === "listplayers" || commandName === "lp") &&
                LIST_PLAYERS_PATTERN.test(latestLine)
            ) {
                return this.complete(
                    SevenDaysToDieCommandCompletionReason.MATCHED_RULE
                );
            }

            if (
                commandName === "kick" &&
                (
                    KICK_SUCCESS_PATTERN.test(latestLine) ||
                    KICK_INVALID_TARGET_PATTERN.test(latestLine)
                )
            ) {
                return this.complete(
                    SevenDaysToDieCommandCompletionReason.MATCHED_RULE
                );
            }

            if (
                commandName === "ban" &&
                commandAction === "add" &&
                (
                    BAN_ADD_SUCCESS_PATTERN.test(latestLine) ||
                    BAN_ADD_INVALID_TARGET_PATTERN.test(latestLine)
                )
            ) {
                return this.complete(
                    SevenDaysToDieCommandCompletionReason.MATCHED_RULE
                );
            }

            if (
                commandName === "ban" &&
                commandAction === "remove" &&
                BAN_REMOVE_SUCCESS_PATTERN.test(latestLine)
            ) {
                return this.complete(
                    SevenDaysToDieCommandCompletionReason.MATCHED_RULE
                );
            }

            if (commandName === "say" && sayMessage !== null) {
                const expectedSuffix = `: ${sayMessage}`;

                if (
                    latestLine.includes("INF Chat (from '-non-player-'") &&
                    latestLine.endsWith(expectedSuffix)
                ) {
                    return this.complete(
                        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
                    );
                }
            }

            if (commandName === "help") {
                if (HELP_DESCRIPTION_PATTERN.test(latestLine)) {
                    helpDescriptionSeen = true;
                    return this.pending();
                }

                if (helpDescriptionSeen && latestLine.length === 0) {
                    return this.complete(
                        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
                    );
                }
            }

            return this.pending();
        };

    }

    complete(completionReason) {
        return Object.freeze({
            completed: true,
            completionReason
        });
    }

    pending() {
        return Object.freeze({ completed: false });
    }

    extractSayMessage(command) {

        const argument = command.slice(3).trim();

        if (argument.length === 0) {
            return null;
        }

        if (
            argument.length >= 2 &&
            argument.startsWith("\"") &&
            argument.endsWith("\"")
        ) {
            return argument.slice(1, -1);
        }

        return argument;
    }

    validateCommand(command) {

        if (
            typeof command !== "string" ||
            command.length === 0 ||
            command.trim() !== command ||
            /[\r\n]/u.test(command)
        ) {
            throw new Error(
                "7 Days to Die completion command must be a non-empty " +
                "single trimmed line."
            );
        }

    }

}

module.exports = SevenDaysToDieCommandCompletionRules;
