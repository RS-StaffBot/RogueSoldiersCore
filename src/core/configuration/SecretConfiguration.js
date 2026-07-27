class SecretConfiguration {

    constructor({
        environment = process.env,
        definitions = {}
    } = {}) {

        if (
            !environment ||
            typeof environment !== "object" ||
            Array.isArray(environment)
        ) {
            throw new Error("Secret configuration environment is invalid.");
        }

        if (
            !definitions ||
            typeof definitions !== "object" ||
            Array.isArray(definitions)
        ) {
            throw new Error("Secret configuration definitions are invalid.");
        }

        this.environment = environment;
        this.definitions = Object.freeze({ ...definitions });

    }

    resolveDefinition(path) {

        if (typeof path !== "string" || path.trim().length === 0) {
            throw new Error("Secret configuration path is invalid.");
        }

        const definition = this.definitions[path];

        if (
            !definition ||
            typeof definition.environmentKey !== "string" ||
            definition.environmentKey.trim().length === 0
        ) {
            throw new Error(`Unknown secret configuration path: ${path}`);
        }

        return definition;

    }

    get(path) {

        const definition = this.resolveDefinition(path);
        const value = this.environment[definition.environmentKey];

        if (value === undefined || value === null || value === "") {
            if (definition.required === false) {
                return null;
            }

            throw new Error(
                `Required secret configuration is missing: ${path}`
            );
        }

        if (typeof value !== "string") {
            throw new Error(
                `Secret configuration must be a string: ${path}`
            );
        }

        return value;

    }

    has(path) {

        const definition = this.resolveDefinition(path);
        const value = this.environment[definition.environmentKey];

        return typeof value === "string" && value.length > 0;

    }

}

module.exports = SecretConfiguration;
