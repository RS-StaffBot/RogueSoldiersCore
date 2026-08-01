class DiscordLifecycleService {

    constructor({
        createReplacement,
        providerManager,
        targetName = "7 Days to Die"
    } = {}) {

        if (
            !providerManager ||
            typeof providerManager.getProviderStatus !== "function" ||
            typeof providerManager.restartProvider !== "function" ||
            typeof providerManager.replaceProvider !== "function" ||
            typeof createReplacement !== "function" ||
            targetName !== "7 Days to Die"
        ) {
            throw new Error(
                "Discord lifecycle service boundary is invalid."
            );
        }

        this.createReplacement = createReplacement;
        this.providerManager = providerManager;
        this.targetName = targetName;

    }

    getStatus() {
        return this.providerManager.getProviderStatus(this.targetName);
    }

    restart() {
        return this.providerManager.restartProvider(this.targetName);
    }

    reload() {
        return this.providerManager.replaceProvider(
            this.targetName,
            this.createReplacement
        );
    }

    asBoundary() {
        return Object.freeze({
            getStatus: this.getStatus.bind(this),
            reload: this.reload.bind(this),
            restart: this.restart.bind(this)
        });
    }

}

module.exports = DiscordLifecycleService;
