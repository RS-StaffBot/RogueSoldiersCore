const Logger = require("../../core/Logger");

class ModuleManager {

    constructor() {
        this.modules = new Map();
        this.initializedModules = new WeakSet();
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

            if (
                operation === "start" &&
                !this.initializedModules.has(module)
            ) {
                Logger.error(
                    `Module '${module.name}' failed to start.`
                );
                Logger.error(
                    "Module initialization did not succeed."
                );
            } else {

                try {
                    await module[operation]();
                    succeeded = true;

                    if (operation === "initialize") {
                        this.initializedModules.add(module);
                    }
                } catch (error) {

                    if (operation === "initialize") {
                        this.initializedModules.delete(module);
                    }

                    if (typeof module.setError === "function") {
                        module.setError();
                    }

                    Logger.error(
                        `Module '${module.name}' failed to ${operation}.`
                    );
                    Logger.error(
                        "Module reported a recoverable lifecycle error."
                    );

                }

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
