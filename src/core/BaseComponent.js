const ComponentState = require("./ComponentState");

class BaseComponent {
    constructor(name) {
        this.name = name;
        this.state = ComponentState.CREATED;
    }

    initialize() {
        this.state = ComponentState.INITIALIZING;

        // Future initialization work goes here

        this.state = ComponentState.READY;
    }

    start() {
        this.state = ComponentState.STARTING;

        // Future startup work goes here

        this.state = ComponentState.RUNNING;
    }

    stop() {
        this.state = ComponentState.STOPPING;

        // Future shutdown work goes here

        this.state = ComponentState.STOPPED;
    }

    setError() {
        this.state = ComponentState.ERROR;
    }

    getStatus() {
        return {
            name: this.name,
            state: this.state
        };
    }
}

module.exports = BaseComponent;