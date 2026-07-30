const KICK_SUCCESS_PATTERN = /^Kicking Player (.+): (.+)$/u;
const KICK_INVALID_TARGET_PATTERN =
    /^"[^"]+" is not a valid entity id, player name or user id\.$/u;
const BAN_SUCCESS_PATTERN =
    /^(?:Steam_[1-9]\d{0,19}|EOS_[A-Za-z0-9]{16,64}) banned until \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}, reason: .+\.$/u;
const BAN_INVALID_TARGET_PATTERN = KICK_INVALID_TARGET_PATTERN;

class DiscordGameAdministrationResultFormatter {

    formatKick(result) {

        if (!result || !Array.isArray(result.responseLines)) {
            return this.failure(
                "The game server returned an invalid kick response."
            );
        }

        const successLine = result.responseLines.find(line =>
            typeof line === "string" && KICK_SUCCESS_PATTERN.test(line)
        );

        if (successLine) {
            const match = KICK_SUCCESS_PATTERN.exec(successLine);

            return Object.freeze({
                message: `Kicked ${match[1]} from the game server.`,
                outcome: "KICKED",
                success: true
            });
        }

        const invalidTarget = result.responseLines.some(line =>
            typeof line === "string" &&
            KICK_INVALID_TARGET_PATTERN.test(line)
        );

        if (invalidTarget) {
            return Object.freeze({
                message: "That player is no longer online or could not be found.",
                outcome: "PLAYER_NOT_FOUND",
                success: false
            });
        }

        return this.failure(
            "The game server returned an unrecognized kick response."
        );

    }

    formatBan(result, displayName, duration, unit) {

        if (!result || !Array.isArray(result.responseLines)) {
            return this.failure(
                "The game server returned an invalid ban response."
            );
        }

        const success = result.responseLines.some(line =>
            typeof line === "string" && BAN_SUCCESS_PATTERN.test(line)
        );

        if (success) {
            return Object.freeze({
                message:
                    `Banned ${displayName} from the game server for ` +
                    `${duration} ${unit}.`,
                outcome: "BANNED",
                success: true
            });
        }

        const invalidTarget = result.responseLines.some(line =>
            typeof line === "string" &&
            BAN_INVALID_TARGET_PATTERN.test(line)
        );

        if (invalidTarget) {
            return Object.freeze({
                message: "That durable player ID could not be found.",
                outcome: "PLAYER_NOT_FOUND",
                success: false
            });
        }

        return this.failure(
            "The game server returned an unrecognized ban response."
        );

    }

    failure(message) {
        return Object.freeze({
            message,
            outcome: "INVALID_RESPONSE",
            success: false
        });
    }

}

module.exports = DiscordGameAdministrationResultFormatter;
