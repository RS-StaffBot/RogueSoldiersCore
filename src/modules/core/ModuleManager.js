const Logger = require("../../core/Logger");

class ModuleManager {

    constructor() {
        this.modules = new Map();
    }

    register(module) {

        if (this.modules.has(module.name)) {
            throw new Error(
                `Module '${module.name}' is already registered.`
            );
        }

        this.modules.set(module.name, module);
    }

    async initializeAll() {
        return this.runLifecycleOperation("initialize");
    }

    async startAll() {
        return this.runLifecycleOperation("start");
    }

    async runLifecycleOperation(operation) {

        const results = [];

        for (const module of this.modules.values()) {

            let succeeded = false;

            try {
                await module[operation]();
                succeeded = true;
            } catch (error) {

                if (typeof module.setError === "function") {
                    module.setError();
                }

                Logger.error(
                    `Module '${module.name}' failed to ${operation}.`
                );
                Logger.error(error.stack || error.message);

            }

            results.push(Object.freeze({
                name: module.name,
                state: module.state,
                succeeded
            }));

        }

        const failed = results.filter(
            result => !result.succeeded
        ).length;

        return Object.freeze({
            failed,
            operation,
            processed: results.length,
            results: Object.freeze(results),
            succeeded: results.length - failed
        });

    }

    async stopAll() {

        const errors = [];
        const modules = [
            ...this.modules.values()
        ].reverse();

        for (const module of modules) {

            try {
                await module.stop();
            } catch (error) {
                errors.push(error);
            }

        }

        if (errors.length > 0) {
            throw new AggregateError(
                errors,
                "One or more Modules failed to stop."
            );
        }

    }

    list() {
        return [...this.modules.keys()];
    }

    get(name) {
        return this.modules.get(name);
    }

}

module.exports = new ModuleManager();
