class ProviderManager {
    constructor() {
        this.providers = new Map();
    }

    register(provider) {
        this.providers.set(provider.name, provider);
    }

    initializeAll() {
        for (const provider of this.providers.values()) {
            provider.initialize();
        }
    }

    startAll() {
        for (const provider of this.providers.values()) {
            provider.start();
        }
    }

    stopAll() {
        for (const provider of this.providers.values()) {
            provider.stop();
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