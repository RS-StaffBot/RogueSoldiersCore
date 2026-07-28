const SevenDaysToDieConsoleLineType = require(
    "./SevenDaysToDieConsoleLineType"
);

const PERIODIC_STATUS_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\s+\S+\s+INF Time:/u;
const ENTITY_EVENT_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\s+\S+\s+INF Entity\s+.+/u;
const SAVE_EVENT_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\s+\S+\s+INF (?:VehicleManager|DroneManager|TurretTracker) sav(?:ing|ed)\b/u;
const DECO_EVENT_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\s+\S+\s+INF \[DECO\]/u;
const CHAT_EVENT_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\s+\S+\s+INF Chat \(/u;

class SevenDaysToDieConsoleLineClassifier {

    classify(line, { command = null } = {}) {

        this.validateLine(line);
        this.validateCommand(command);

        if (this.isMatchingSayResponse(line, command)) {
            return SevenDaysToDieConsoleLineType.RESPONSE;
        }

        if (
            PERIODIC_STATUS_PATTERN.test(line) ||
            ENTITY_EVENT_PATTERN.test(line) ||
            SAVE_EVENT_PATTERN.test(line) ||
            DECO_EVENT_PATTERN.test(line) ||
            CHAT_EVENT_PATTERN.test(line)
        ) {
            return SevenDaysToDieConsoleLineType.EVENT;
        }

        return SevenDaysToDieConsoleLineType.RESPONSE;
    }

    separate(lines, { command = null } = {}) {

        if (
            !Array.isArray(lines) ||
            lines.some(line => typeof line !== "string")
        ) {
            throw new Error(
                "7 Days to Die console lines must be an array of strings."
            );
        }

        this.validateCommand(command);

        const responseLines = [];
        const eventLines = [];

        for (const line of lines) {
            if (
                this.classify(line, { command }) ===
                SevenDaysToDieConsoleLineType.EVENT
            ) {
                eventLines.push(line);
            } else {
                responseLines.push(line);
            }
        }

        return Object.freeze({
            responseLines: Object.freeze(responseLines),
            eventLines: Object.freeze(eventLines)
        });
    }

    isMatchingSayResponse(line, command) {

        if (typeof command !== "string") {
            return false;
        }

        const commandName = command.toLowerCase().split(/\s+/u)[0];

        if (commandName !== "say") {
            return false;
        }

        const argument = command.slice(3).trim();

        if (argument.length === 0) {
            return false;
        }

        const message = (
            argument.length >= 2 &&
            argument.startsWith("\"") &&
            argument.endsWith("\"")
        )
            ? argument.slice(1, -1)
            : argument;

        return (
            line.includes("INF Chat (from '-non-player-'") &&
            line.endsWith(`: ${message}`)
        );
    }

    validateLine(line) {

        if (typeof line !== "string") {
            throw new Error(
                "7 Days to Die console line must be a string."
            );
        }
    }

    validateCommand(command) {

        if (command === null) {
            return;
        }

        if (
            typeof command !== "string" ||
            command.length === 0 ||
            command.trim() !== command ||
            /[\r\n]/u.test(command)
        ) {
            throw new Error(
                "7 Days to Die console command must be null or a non-empty " +
                "single trimmed line."
            );
        }
    }
}

module.exports = SevenDaysToDieConsoleLineClassifier;
