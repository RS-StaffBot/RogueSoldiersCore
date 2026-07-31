const ComponentState = require(
    "../../../core/ComponentState"
);

const ResolutionStatus = Object.freeze({
    AVAILABLE: "AVAILABLE",
    PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
    PROVIDER_NOT_READY: "PROVIDER_NOT_READY",
    INVALID_PROVIDER_BOUNDARY: "INVALID_PROVIDER_BOUNDARY"
});

class DiscordIdentityProofProviderResolver {

    constructor({ resolveProvider } = {}) {

        if (typeof resolveProvider !== "function") {
            throw new Error(
                "Identity proof Provider resolver must be a function."
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

        if (typeof provider.collectIdentityProof !== "function") {
            return this.createFailure(
                ResolutionStatus.INVALID_PROVIDER_BOUNDARY
            );
        }

        return Object.freeze({
            available: true,
            service: Object.freeze({
                collectIdentityProof:
                    provider.collectIdentityProof.bind(provider)
            }),
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

DiscordIdentityProofProviderResolver.Status = ResolutionStatus;

module.exports = DiscordIdentityProofProviderResolver;
