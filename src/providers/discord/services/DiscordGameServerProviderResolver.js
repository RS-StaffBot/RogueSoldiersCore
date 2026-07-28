const ComponentState = require(
    "../../../core/ComponentState"
);

const ResolutionStatus = Object.freeze({
    AVAILABLE: "AVAILABLE",
    PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
    PROVIDER_NOT_READY: "PROVIDER_NOT_READY",
    INVALID_PROVIDER_BOUNDARY: "INVALID_PROVIDER_BOUNDARY"
});

class DiscordGameServerProviderResolver {

    constructor({ resolveProvider } = {}) {

        if (typeof resolveProvider !== "function") {
            throw new Error(
                "7 Days to Die Provider resolver must be a function."
            );
        }

        this.resolveProvider = resolveProvider;

    }

    resolve() {

        let provider;

        try {
            provider = this.resolveProvider("7 Days to Die");
        } catch {
            return this.createFailure(
                ResolutionStatus.PROVIDER_UNAVAILABLE
            );
        }

        if (provider === null || provider === undefined) {
            return this.createFailure(
                ResolutionStatus.PROVIDER_UNAVAILABLE
            );
        }

        if (
            typeof provider !== "object" ||
            Array.isArray(provider) ||
            provider.name !== "7 Days to Die"
        ) {
            return this.createFailure(
                ResolutionStatus.INVALID_PROVIDER_BOUNDARY
            );
        }

        if (provider.state !== ComponentState.RUNNING) {
            return this.createFailure(
                ResolutionStatus.PROVIDER_NOT_READY
            );
        }

        if (typeof provider.executeCommand !== "function") {
            return this.createFailure(
                ResolutionStatus.INVALID_PROVIDER_BOUNDARY
            );
        }

        const service = Object.freeze({
            executeCommand: provider.executeCommand.bind(provider)
        });

        return Object.freeze({
            available: true,
            service,
            status: ResolutionStatus.AVAILABLE
        });

    }

    createFailure(status) {
        return Object.freeze({
            available: false,
            status
        });
    }

}

DiscordGameServerProviderResolver.Status = ResolutionStatus;

module.exports = DiscordGameServerProviderResolver;
