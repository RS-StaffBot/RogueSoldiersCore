class Registry {
    constructor() {
        this.services = new Map();
    }

    register(name, service) {
        if (this.services.has(name)) {
            throw new Error(`Service '${name}' is already registered.`);
        }

        this.services.set(name, service);
    }

    get(name) {
        if (!this.services.has(name)) {
            throw new Error(`Service '${name}' is not registered.`);
        }

        return this.services.get(name);
    }

    has(name) {
        return this.services.has(name);
    }

    list() {
        return [...this.services.keys()];
    }
}

module.exports = new Registry();