class ComponentLifecycleOperationLock {
    constructor() {
        this.busy = false;
    }

    async run(action) {
        if (this.busy) {
            return Object.freeze({
                acquired: false,
                value: null
            });
        }

        this.busy = true;

        try {
            return Object.freeze({
                acquired: true,
                value: await action()
            });
        } finally {
            this.busy = false;
        }
    }
}

module.exports = new ComponentLifecycleOperationLock();
