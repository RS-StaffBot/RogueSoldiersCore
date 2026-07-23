class ModuleManager {

    constructor() {
        this.modules = new Map();
    }

    register(module) {
        this.modules.set(module.name, module);
    }

    initializeAll() {
        for (const module of this.modules.values()) {
            module.initialize();
        }
    }

    startAll() {
        for (const module of this.modules.values()) {
            module.start();
        }
    }

    stopAll() {
        for (const module of this.modules.values()) {
            module.stop();
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