class ProviderManager {
    constructor() {
        this.providers = new Map();
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
        for (const provider of this.providers.values()) {
            await provider.initialize();
        }
    }

    async startAll() {
        for (const provider of this.providers.values()) {
            await provider.start();
        }
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
