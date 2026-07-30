const KICK_SUCCESS_PATTERN = /^Kicking Player (.+): (.+)$/u;
const KICK_INVALID_TARGET_PATTERN =
    /^"[^"]+" is not a valid entity id, player name or user id\.$/u;

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

    failure(message) {
        return Object.freeze({
            message,
            outcome: "INVALID_RESPONSE",
            success: false
        });
    }

}

module.exports = DiscordGameAdministrationResultFormatter;
