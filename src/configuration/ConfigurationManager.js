const fs = require("fs");
const path = require("path");

require("dotenv").config();

class ConfigurationManager {

    constructor() {

        this.config = {};

    }

    load() {

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

            const key = relative
                .replace(/\\/g, ".")
                .replace(/\//g, ".")
                .replace(".json", "");

            this.config[key] = JSON.parse(
                fs.readFileSync(fullPath, "utf8")
            );

        }

    }

    get(pathString, defaultValue = null) {

        const parts = pathString.split(".");

        let current = this.config;

        for (const part of parts) {

            if (!(part in current)) {
                return defaultValue;
            }

            current = current[part];

        }

        return current;

    }

    getEnv(key, defaultValue = null) {

        return process.env[key] ?? defaultValue;

    }

}

module.exports = new ConfigurationManager();