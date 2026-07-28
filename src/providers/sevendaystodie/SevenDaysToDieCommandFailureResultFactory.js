const SevenDaysToDieCommandCompletionReason = require(
    "./SevenDaysToDieCommandCompletionReason"
);
const SevenDaysToDieCommandFailureType = require(
    "./SevenDaysToDieCommandFailureType"
);
const SevenDaysToDieCommandResult = require(
    "./SevenDaysToDieCommandResult"
);
const SevenDaysToDieCommandStatus = require(
    "./SevenDaysToDieCommandStatus"
);

class SevenDaysToDieCommandFailureResultFactory {

    create({
        command,
        failureType,
        responseLines = [],
        eventLines = [],
        startedAt,
        completedAt,
        truncated = false
    } = {}) {

        const mapping = this.mapFailure(failureType);

        return new SevenDaysToDieCommandResult({
            command,
            status: mapping.status,
            responseLines,
            eventLines,
            startedAt,
            completedAt,
            completionReason: mapping.completionReason,
            truncated: truncated ||
                failureType === SevenDaysToDieCommandFailureType.SIZE_LIMIT
        });

    }

    mapFailure(failureType) {

        switch (failureType) {
            case SevenDaysToDieCommandFailureType.TIMEOUT:
                return Object.freeze({
                    status: SevenDaysToDieCommandStatus.TIMEOUT,
                    completionReason:
                        SevenDaysToDieCommandCompletionReason.TIMEOUT
                });
            case SevenDaysToDieCommandFailureType.DISCONNECTED:
                return Object.freeze({
                    status: SevenDaysToDieCommandStatus.DISCONNECTED,
                    completionReason:
                        SevenDaysToDieCommandCompletionReason.DISCONNECTED
                });
            case SevenDaysToDieCommandFailureType.SIZE_LIMIT:
                return Object.freeze({
                    status: SevenDaysToDieCommandStatus.ERROR,
                    completionReason:
                        SevenDaysToDieCommandCompletionReason.SIZE_LIMIT
                });
            case SevenDaysToDieCommandFailureType.WRITE_ERROR:
            case SevenDaysToDieCommandFailureType.COMPLETION_ERROR:
                return Object.freeze({
                    status: SevenDaysToDieCommandStatus.ERROR,
                    completionReason:
                        SevenDaysToDieCommandCompletionReason.EXECUTION_ERROR
                });
            default:
                throw new Error(
                    "7 Days to Die command failure type is invalid."
                );
        }

    }

}

module.exports = SevenDaysToDieCommandFailureResultFactory;
