const ComponentState = require(
    "../../../core/ComponentState"
);

const ResolutionStatus = Object.freeze({
    AVAILABLE: "AVAILABLE",
    MODULE_UNAVAILABLE: "MODULE_UNAVAILABLE",
    MODULE_NOT_READY: "MODULE_NOT_READY",
    INVALID_MODULE_BOUNDARY: "INVALID_MODULE_BOUNDARY"
});

class DiscordIdentityModuleResolver {

    constructor({ resolveModule } = {}) {

        if (typeof resolveModule !== "function") {
            throw new Error(
                "Identity Module resolver must be a function."
            );
        }

        this.resolveModule = resolveModule;

    }

    resolve() {

        let identity;

        try {
            identity = this.resolveModule("Identity");
        } catch {
            return this.createFailure(
                ResolutionStatus.MODULE_UNAVAILABLE
            );
        }

        if (identity === null || identity === undefined) {
            return this.createFailure(
                ResolutionStatus.MODULE_UNAVAILABLE
            );
        }

        if (
            typeof identity !== "object" ||
            Array.isArray(identity) ||
            identity.name !== "Identity"
        ) {
            return this.createFailure(
                ResolutionStatus.INVALID_MODULE_BOUNDARY
            );
        }

        if (identity.state !== ComponentState.RUNNING) {
            return this.createFailure(
                ResolutionStatus.MODULE_NOT_READY
            );
        }

        if (
            typeof identity.getOwnStatus !== "function" ||
            typeof identity.recordVerifiedSelfLink !== "function"
        ) {
            return this.createFailure(
                ResolutionStatus.INVALID_MODULE_BOUNDARY
            );
        }

        return Object.freeze({
            available: true,
            service: Object.freeze({
                getOwnStatus:
                    identity.getOwnStatus.bind(identity),
                recordVerifiedSelfLink:
                    identity.recordVerifiedSelfLink.bind(identity)
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

DiscordIdentityModuleResolver.Status = ResolutionStatus;

module.exports = DiscordIdentityModuleResolver;
