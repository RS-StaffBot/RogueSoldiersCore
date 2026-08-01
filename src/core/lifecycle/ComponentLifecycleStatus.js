const ComponentState = require("../ComponentState");

class ComponentLifecycleStatus {
    static create({
        componentType,
        initialized,
        name,
        state
    }) {
        return Object.freeze({
            componentType,
            initialized: initialized === true,
            name,
            operational: state === ComponentState.RUNNING,
            state
        });
    }
}

module.exports = ComponentLifecycleStatus;
