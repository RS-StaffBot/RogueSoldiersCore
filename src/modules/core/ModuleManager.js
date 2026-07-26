class ModuleManager {

    constructor() {
        this.modules = new Map();
    }

    register(module) {
        this.modules.set(module.name, module);
    }

    async initializeAll() {
        for (const module of this.modules.values()) {
            await module.initialize();
        }
    }

    async startAll() {
        for (const module of this.modules.values()) {
            await module.start();
        }
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

    list() {
        return [...this.modules.keys()];
    }

    get(name) {
        return this.modules.get(name);
    }

}

module.exports = new ModuleManager();
