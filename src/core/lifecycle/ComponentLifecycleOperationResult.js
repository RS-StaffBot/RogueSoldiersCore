class ComponentLifecycleOperationResult {
    static create({
        componentType,
        name,
        operation,
        outcome,
        state
    }) {
        return Object.freeze({
            componentType,
            name,
            operation,
            outcome,
            state,
            succeeded: outcome === "SUCCEEDED"
        });
    }
}

module.exports = ComponentLifecycleOperationResult;
