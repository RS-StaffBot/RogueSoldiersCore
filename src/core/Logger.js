class Logger {
    static info(message) {
        console.log(`[INFO] ${message}`);
    }

    static warn(message) {
        console.warn(`[WARN] ${message}`);
    }

    static error(message) {
        console.error(`[ERROR] ${message}`);
    }
}

module.exports = Logger;