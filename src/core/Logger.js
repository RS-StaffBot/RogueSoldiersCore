const ANSI_COLOR = Object.freeze({
    CYAN: "\u001b[36m",
    YELLOW: "\u001b[33m",
    RED: "\u001b[31m",
    MAGENTA: "\u001b[35m",
    RESET: "\u001b[0m"
});

class Logger {

    static supportsColor(stream) {

        return Boolean(
            stream &&
            stream.isTTY &&
            process.env.NO_COLOR === undefined
        );

    }

    static colorize(text, color, stream) {

        if (!this.supportsColor(stream)) {
            return text;
        }

        return `${color}${text}${ANSI_COLOR.RESET}`;

    }

    static info(message) {

        const prefix = this.colorize(
            "[INFO]",
            ANSI_COLOR.CYAN,
            process.stdout
        );

        console.log(`${prefix} ${message}`);

    }

    static warn(message) {

        const prefix = this.colorize(
            "[WARN]",
            ANSI_COLOR.YELLOW,
            process.stderr
        );

        console.warn(`${prefix} ${message}`);

    }

    static error(message) {

        const prefix = this.colorize(
            "[ERROR]",
            ANSI_COLOR.RED,
            process.stderr
        );

        console.error(`${prefix} ${message}`);

    }

    static moderationAudit(message) {

        const infoPrefix = this.colorize(
            "[INFO]",
            ANSI_COLOR.CYAN,
            process.stdout
        );

        const auditPrefix = this.colorize(
            "[MODERATION AUDIT]",
            ANSI_COLOR.MAGENTA,
            process.stdout
        );

        console.log(
            `${infoPrefix} ${auditPrefix}\n${message}`
        );

    }

}

module.exports = Logger;