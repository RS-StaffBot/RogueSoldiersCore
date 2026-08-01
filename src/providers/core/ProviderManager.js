const Logger = require("../../core/Logger");

class ProviderManager {
    constructor() {
        this.providers = new Map();
        this.initializedProviders = new WeakSet();
    }

    register(provider) {

        if (this.providers.has(provider.name)) {
            throw new Error(
                `Provider '${provider.name}' is already registered.`
            );
        }

        this.providers.set(provider.name, provider);
    }

    async initializeAll() {
        return this.runLifecycleOperation("initialize");
    }

    async startAll() {
        return this.runLifecycleOperation("start");
    }

    async runLifecycleOperation(operation) {

        const results = [];

        for (const provider of this.providers.values()) {

            let succeeded = false;

            if (
                operation === "start" &&
                !this.initializedProviders.has(provider)
            ) {
                Logger.error(
                    `Provider '${provider.name}' failed to start.`
                );
                Logger.error(
                    "Provider initialization did not succeed."
                );
            } else {

                try {
                    await provider[operation]();
                    succeeded = true;

                    if (operation === "initialize") {
                        this.initializedProviders.add(provider);
                    }
                } catch (error) {

                    if (operation === "initialize") {
                        this.initializedProviders.delete(provider);
                    }

                    if (typeof provider.setError === "function") {
                        provider.setError();
                    }

                    Logger.error(
                        `Provider '${provider.name}' failed to ${operation}.`
                    );
                    Logger.error(
                        "Provider reported a recoverable lifecycle error."
                    );

                }

            }

            results.push(Object.freeze({
                name: provider.name,
                state: provider.state,
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
        const providers = [
            ...this.providers.values()
        ].reverse();

        for (const provider of providers) {

            try {
                await provider.stop();
            } catch (error) {
                errors.push(error);
            }

        }

        if (errors.length > 0) {
            throw new AggregateError(
                errors,
                "One or more Providers failed to stop."
            );
        }

    }

    list() {
        return [...this.providers.keys()];
    }

    get(name) {
        return this.providers.get(name);
    }
}

module.exports = new ProviderManager();
