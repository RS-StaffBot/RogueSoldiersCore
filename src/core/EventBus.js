class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        this.events.get(event).push(listener);
    }

    emit(event, data = {}) {
        if (!this.events.has(event)) {
            return;
        }

        for (const listener of this.events.get(event)) {
            listener(data);
        }
    }

    eventNames() {
        return [...this.events.keys()];
    }
}

module.exports = new EventBus();