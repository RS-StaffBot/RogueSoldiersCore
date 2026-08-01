const ComponentState = require("../../core/ComponentState");
const Logger = require("../../core/Logger");
const ComponentLifecycleOperationResult = require(
    "../../core/lifecycle/ComponentLifecycleOperationResult"
);
const ComponentLifecycleStatus = require(
    "../../core/lifecycle/ComponentLifecycleStatus"
);

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

    async startProvider(name) {
        return this.runIndividualOperation({
            allowedStates: new Set([
                ComponentState.READY,
                ComponentState.STOPPED,
                ComponentState.ERROR
            ]),
            methodName: "start",
            name,
            operation: "START",
            requiresInitialization: true
        });
    }

    async stopProvider(name) {
        return this.runIndividualOperation({
            allowedStates: new Set([ComponentState.RUNNING]),
            methodName: "stop",
            name,
            operation: "STOP",
            requiresInitialization: false
        });
    }

    async runIndividualOperation({
        allowedStates,
        methodName,
        name,
        operation,
        requiresInitialization
    }) {
        const provider = this.providers.get(name);

        if (!provider) {
            return this.createOperationResult({
                name: null,
                operation,
                outcome: "NOT_FOUND",
                state: null
            });
        }

        if (
            requiresInitialization &&
            !this.initializedProviders.has(provider)
        ) {
            return this.createOperationResult({
                name: provider.name,
                operation,
                outcome: "NOT_INITIALIZED",
                state: provider.state
            });
        }

        if (!allowedStates.has(provider.state)) {
            return this.createOperationResult({
                name: provider.name,
                operation,
                outcome: "INVALID_STATE",
                state: provider.state
            });
        }

        try {
            await provider[methodName]();

            return this.createOperationResult({
                name: provider.name,
                operation,
                outcome: "SUCCEEDED",
                state: provider.state
            });
        } catch (error) {
            if (typeof provider.setError === "function") {
                provider.setError();
            }

            Logger.error(
                `Provider '${provider.name}' failed to ${methodName}.`
            );
            Logger.error(
                "Provider reported a recoverable lifecycle error."
            );

            return this.createOperationResult({
                name: provider.name,
                operation,
                outcome: "FAILED",
                state: provider.state
            });
        }
    }

    createOperationResult({ name, operation, outcome, state }) {
        return ComponentLifecycleOperationResult.create({
            componentType: "PROVIDER",
            name,
            operation,
            outcome,
            state
        });
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

    listProviderStatuses() {
        return Object.freeze(
            [...this.providers.values()].map(
                provider => this.createStatus(provider)
            )
        );
    }

    getProviderStatus(name) {
        const provider = this.providers.get(name);
        return provider ? this.createStatus(provider) : null;
    }

    createStatus(provider) {
        return ComponentLifecycleStatus.create({
            componentType: "PROVIDER",
            initialized: this.initializedProviders.has(provider),
            name: provider.name,
            state: provider.state
        });
    }

    list() {
        return [...this.providers.keys()];
    }

    get(name) {
        return this.providers.get(name);
    }
}

module.exports = new ProviderManager();
