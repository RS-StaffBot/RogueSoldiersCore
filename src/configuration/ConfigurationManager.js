const fs = require("fs");
const path = require("path");

require("dotenv").config();

class ConfigurationManager {

    constructor() {
        this.config = {};
    }

    load() {

        this.config = {};

        const configRoot = path.join(process.cwd(), "config");

        this.loadDirectory(configRoot);

    }

    loadDirectory(directory) {

        if (!fs.existsSync(directory)) {
            return;
        }

        const entries = fs.readdirSync(directory, {
            withFileTypes: true
        });

        for (const entry of entries) {

            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                this.loadDirectory(fullPath);
                continue;
            }

            if (!entry.name.endsWith(".json")) {
                continue;
            }

            const relative = path.relative(
                path.join(process.cwd(), "config"),
                fullPath
            );

            const keys = relative
                .replace(/\\/g, "/")
                .replace(".json", "")
                .split("/");

            let current = this.config;

            while (keys.length > 1) {

                const key = keys.shift();

                if (!current[key]) {
                    current[key] = {};
                }

                current = current[key];

            }

            current[keys[0]] = JSON.parse(
                fs.readFileSync(fullPath, "utf8")
            );

        }

    }

    get(pathString, defaultValue = null) {

        const keys = pathString.split(".");

        let current = this.config;

        for (const key of keys) {

            if (
                current === null ||
                current === undefined ||
                !(key in current)
            ) {
                return defaultValue;
            }

            current = current[key];

        }

        return current;

    }

    getEnv(key, defaultValue = null) {
        return process.env[key] ?? defaultValue;
    }

}

module.exports = new ConfigurationManager();