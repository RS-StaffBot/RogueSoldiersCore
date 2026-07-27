class SettingRegistry {

    constructor() {
        this.definitions = new Map();
    }

    register(definition) {

        if (
            !definition ||
            typeof definition.key !== "string" ||
            typeof definition.toSnapshot !== "function"
        ) {
            throw new Error("Setting definition is invalid.");
        }

        if (this.definitions.has(definition.key)) {
            throw new Error(`Setting is already registered: ${definition.key}`);
        }

        this.definitions.set(definition.key, definition);

        return definition.toSnapshot();

    }

    get(key) {

        const definition = this.definitions.get(key);

        if (!definition) {
            throw new Error(`Unknown setting: ${key}`);
        }

        return definition.toSnapshot();

    }

    list() {

        return Object.freeze(
            Array.from(
                this.definitions.values(),
                definition => definition.toSnapshot()
            )
        );

    }

}

module.exports = SettingRegistry;
