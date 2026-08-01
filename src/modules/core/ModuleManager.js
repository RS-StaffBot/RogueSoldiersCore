const ComponentState = require("../../core/ComponentState");
const Logger = require("../../core/Logger");
const ComponentLifecycleOperationResult = require(
    "../../core/lifecycle/ComponentLifecycleOperationResult"
);
const ComponentLifecycleStatus = require(
    "../../core/lifecycle/ComponentLifecycleStatus"
);

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

    async startModule(name) {
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

    async stopModule(name) {
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
        const module = this.modules.get(name);

        if (!module) {
            return this.createOperationResult({
                name: null,
                operation,
                outcome: "NOT_FOUND",
                state: null
            });
        }

        if (
            requiresInitialization &&
            !this.initializedModules.has(module)
        ) {
            return this.createOperationResult({
                name: module.name,
                operation,
                outcome: "NOT_INITIALIZED",
                state: module.state
            });
        }

        if (!allowedStates.has(module.state)) {
            return this.createOperationResult({
                name: module.name,
                operation,
                outcome: "INVALID_STATE",
                state: module.state
            });
        }

        try {
            await module[methodName]();

            return this.createOperationResult({
                name: module.name,
                operation,
                outcome: "SUCCEEDED",
                state: module.state
            });
        } catch (error) {
            if (typeof module.setError === "function") {
                module.setError();
            }

            Logger.error(
                `Module '${module.name}' failed to ${methodName}.`
            );
            Logger.error(
                "Module reported a recoverable lifecycle error."
            );

            return this.createOperationResult({
                name: module.name,
                operation,
                outcome: "FAILED",
                state: module.state
            });
        }
    }

    createOperationResult({ name, operation, outcome, state }) {
        return ComponentLifecycleOperationResult.create({
            componentType: "MODULE",
            name,
            operation,
            outcome,
            state
        });
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

    listModuleStatuses() {
        return Object.freeze(
            [...this.modules.values()].map(
                module => this.createStatus(module)
            )
        );
    }

    getModuleStatus(name) {
        const module = this.modules.get(name);
        return module ? this.createStatus(module) : null;
    }

    createStatus(module) {
        return ComponentLifecycleStatus.create({
            componentType: "MODULE",
            initialized: this.initializedModules.has(module),
            name: module.name,
            state: module.state
        });
    }

    list() {
        return [...this.modules.keys()];
    }

    get(name) {
        return this.modules.get(name);
    }

}

module.exports = new ModuleManager();
