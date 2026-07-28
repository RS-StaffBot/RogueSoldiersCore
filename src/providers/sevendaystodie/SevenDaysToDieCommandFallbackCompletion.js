const SevenDaysToDieCommandCompletionReason = require(
    "./SevenDaysToDieCommandCompletionReason"
);

class SevenDaysToDieCommandFallbackCompletion {

    createTracker(command) {

        this.validateCommand(command);

        const lines = [];
        let settled = false;

        return Object.freeze({
            acceptLine: line => {

                if (settled) {
                    throw new Error(
                        "7 Days to Die fallback completion is already settled."
                    );
                }

                if (typeof line !== "string") {
                    throw new Error(
                        "7 Days to Die fallback line must be a string."
                    );
                }

                lines.push(line);

                return Object.freeze({
                    completed: false,
                    lineCount: lines.length
                });
            },
            completeAfterInactivity: () => {

                if (settled) {
                    throw new Error(
                        "7 Days to Die fallback completion is already settled."
                    );
                }

                const meaningfulLines = lines.filter(
                    line => line.length > 0
                );

                if (meaningfulLines.length === 0) {
                    return Object.freeze({ completed: false });
                }

                settled = true;

                return Object.freeze({
                    completed: true,
                    completionReason:
                        SevenDaysToDieCommandCompletionReason.INACTIVITY,
                    responseLines: Object.freeze([...lines])
                });
            },
            getLines: () => Object.freeze([...lines]),
            isSettled: () => settled
        });
    }

    validateCommand(command) {

        if (
            typeof command !== "string" ||
            command.length === 0 ||
            command.trim() !== command ||
            /[\r\n]/u.test(command)
        ) {
            throw new Error(
                "7 Days to Die fallback command must be a non-empty " +
                "single trimmed line."
            );
        }

    }

}

module.exports = SevenDaysToDieCommandFallbackCompletion;
