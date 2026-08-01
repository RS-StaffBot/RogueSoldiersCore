const ComponentState = require("../../core/ComponentState");
const Logger = require("../../core/Logger");
const ComponentLifecycleOperationLock = require(
    "../../core/lifecycle/ComponentLifecycleOperationLock"
);
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
        return this.runLockedOperation(name, "START", () =>
            this.runIndividualOperation({
                allowedStates: new Set([
                    ComponentState.READY,
                    ComponentState.STOPPED,
                    ComponentState.ERROR
                ]),
                methodName: "start",
                name,
                operation: "START",
                requiresInitialization: true
            })
        );
    }

    async stopProvider(name) {
        return this.runLockedOperation(name, "STOP", () =>
            this.runIndividualOperation({
                allowedStates: new Set([ComponentState.RUNNING]),
                methodName: "stop",
                name,
                operation: "STOP",
                requiresInitialization: false
            })
        );
    }

    async restartProvider(name) {
        return this.runLockedOperation(name, "RESTART", () =>
            this.runRestartOperation(name)
        );
    }

    async replaceProvider(name, createCandidate) {
        return this.runLockedOperation(name, "REPLACE", () =>
            this.runReplacementOperation(name, createCandidate)
        );
    }

    async runLockedOperation(name, operation, action) {
        const locked = await ComponentLifecycleOperationLock.run(action);

        if (locked.acquired) {
            return locked.value;
        }

        const provider = this.providers.get(name);
        return this.createOperationResult({
            name: provider ? provider.name : null,
            operation,
            outcome: "BUSY",
            state: provider ? provider.state : null
        });
    }

    async runRestartOperation(name) {
        const provider = this.providers.get(name);

        if (!provider) {
            return this.createOperationResult({
                name: null,
                operation: "RESTART",
                outcome: "NOT_FOUND",
                state: null
            });
        }

        if (!this.initializedProviders.has(provider)) {
            return this.createOperationResult({
                name: provider.name,
                operation: "RESTART",
                outcome: "NOT_INITIALIZED",
                state: provider.state
            });
        }

        if (provider.state !== ComponentState.RUNNING) {
            return this.createOperationResult({
                name: provider.name,
                operation: "RESTART",
                outcome: "INVALID_STATE",
                state: provider.state
            });
        }

        try {
            await provider.stop();

            if (provider.state !== ComponentState.STOPPED) {
                throw new Error("Provider did not stop cleanly.");
            }

            await provider.start();

            if (provider.state !== ComponentState.RUNNING) {
                throw new Error("Provider did not start cleanly.");
            }

            return this.createOperationResult({
                name: provider.name,
                operation: "RESTART",
                outcome: "SUCCEEDED",
                state: provider.state
            });
        } catch (error) {
            if (typeof provider.setError === "function") {
                provider.setError();
            }

            Logger.error(`Provider '${provider.name}' failed to restart.`);
            Logger.error(
                "Provider reported a recoverable lifecycle error."
            );

            return this.createOperationResult({
                name: provider.name,
                operation: "RESTART",
                outcome: "FAILED",
                state: provider.state
            });
        }
    }

    async runReplacementOperation(name, createCandidate) {
        const current = this.providers.get(name);

        if (!current) {
            return this.createOperationResult({
                name: null,
                operation: "REPLACE",
                outcome: "NOT_FOUND",
                state: null
            });
        }

        if (!this.initializedProviders.has(current)) {
            return this.createOperationResult({
                name: current.name,
                operation: "REPLACE",
                outcome: "NOT_INITIALIZED",
                state: current.state
            });
        }

        if (
            current.state !== ComponentState.RUNNING &&
            current.state !== ComponentState.ERROR
        ) {
            return this.createOperationResult({
                name: current.name,
                operation: "REPLACE",
                outcome: "INVALID_STATE",
                state: current.state
            });
        }

        if (typeof createCandidate !== "function") {
            return this.createOperationResult({
                name: current.name,
                operation: "REPLACE",
                outcome: "FAILED",
                state: current.state
            });
        }

        let candidate = null;

        try {
            candidate = await createCandidate();

            if (
                !candidate ||
                candidate === current ||
                candidate.name !== current.name ||
                typeof candidate.initialize !== "function" ||
                typeof candidate.start !== "function" ||
                typeof candidate.stop !== "function"
            ) {
                throw new Error("Replacement candidate is invalid.");
            }

            await candidate.initialize();

            if (candidate.state !== ComponentState.READY) {
                throw new Error("Replacement candidate is not ready.");
            }

            await candidate.start();

            if (candidate.state !== ComponentState.RUNNING) {
                throw new Error("Replacement candidate is not running.");
            }

            await current.stop();

            if (current.state !== ComponentState.STOPPED) {
                throw new Error("Current Provider did not stop cleanly.");
            }

            this.providers.set(name, candidate);
            this.initializedProviders.add(candidate);

            return this.createOperationResult({
                name: candidate.name,
                operation: "REPLACE",
                outcome: "SUCCEEDED",
                state: candidate.state
            });
        } catch (error) {
            await this.stopReplacementCandidate(candidate);

            Logger.error(`Provider '${current.name}' failed to replace.`);
            Logger.error(
                "Provider reported a recoverable lifecycle error."
            );

            return this.createOperationResult({
                name: current.name,
                operation: "REPLACE",
                outcome: "FAILED",
                state: current.state
            });
        }
    }

    async stopReplacementCandidate(candidate) {
        if (!candidate || typeof candidate.stop !== "function") {
            return;
        }

        if (
            candidate.state === ComponentState.CREATED ||
            candidate.state === ComponentState.STOPPED
        ) {
            return;
        }

        try {
            await candidate.stop();
        } catch {
            if (typeof candidate.setError === "function") {
                candidate.setError();
            }
        }
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

        const failed = results.filter(result => !result.succeeded).length;

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
        const providers = [...this.providers.values()].reverse();

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
            [...this.providers.values()].map(provider =>
                this.createStatus(provider)
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
