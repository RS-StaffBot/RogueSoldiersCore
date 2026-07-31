const IdentityLinkContract = require(
    "../../../modules/identity/IdentityLinkContract"
);
const SevenDaysToDieIdentityProofContract = require(
    "./SevenDaysToDieIdentityProofContract"
);

class SevenDaysToDieIdentityProofEvaluator {

    evaluate({
        gameUserId,
        challenge,
        evidence,
        evaluatedAt
    }) {

        this.validateRequest({
            gameUserId,
            challenge,
            evidence,
            evaluatedAt
        });

        const matches = evidence.filter(item =>
            this.isValidEvidence(item, evaluatedAt) &&
            item.gameUserId === gameUserId &&
            item.challenge === challenge
        );

        if (matches.length === 1) {
            return this.createResult(
                SevenDaysToDieIdentityProofEvaluator.Outcome.VERIFIED
            );
        }

        if (matches.length > 1) {
            return this.createResult(
                SevenDaysToDieIdentityProofEvaluator.Outcome.AMBIGUOUS
            );
        }

        return this.createResult(
            SevenDaysToDieIdentityProofEvaluator.Outcome.NOT_VERIFIED
        );

    }

    validateRequest({
        gameUserId,
        challenge,
        evidence,
        evaluatedAt
    }) {

        if (!this.isSupportedGameUserId(gameUserId)) {
            throw new Error(
                "A supported durable game user ID is required."
            );
        }

        if (
            typeof challenge !== "string" ||
            challenge.length < 16 ||
            challenge.length > 128 ||
            !/^[A-Za-z0-9_-]+$/u.test(challenge)
        ) {
            throw new Error(
                "A valid identity proof challenge is required."
            );
        }

        if (!Array.isArray(evidence)) {
            throw new Error(
                "Identity proof evidence must be an array."
            );
        }

        if (!Number.isSafeInteger(evaluatedAt) || evaluatedAt <= 0) {
            throw new Error(
                "A valid identity proof evaluation time is required."
            );
        }

    }

    isSupportedGameUserId(gameUserId) {
        return (
            typeof gameUserId === "string" &&
            IdentityLinkContract.gameIdentity
                .supportedPrefixes.some(prefix =>
                    gameUserId.startsWith(prefix) &&
                    gameUserId.length > prefix.length &&
                    /^[A-Za-z0-9_]+$/u.test(gameUserId)
                )
        );
    }

    isValidEvidence(item, evaluatedAt) {

        if (
            !item ||
            typeof item !== "object" ||
            Array.isArray(item)
        ) {
            return false;
        }

        const keys = Object.keys(item).sort();
        const allowedKeys = [
            ...SevenDaysToDieIdentityProofContract
                .allowedEvidenceFields
        ].sort();

        if (
            keys.length !== allowedKeys.length ||
            keys.some((key, index) => key !== allowedKeys[index])
        ) {
            return false;
        }

        if (
            !this.isSupportedGameUserId(item.gameUserId) ||
            typeof item.challenge !== "string" ||
            !Number.isSafeInteger(item.observedAt) ||
            item.observedAt <= 0 ||
            item.observedAt > evaluatedAt
        ) {
            return false;
        }

        return (
            evaluatedAt - item.observedAt <=
            SevenDaysToDieIdentityProofContract
                .challengeLifetimeMilliseconds
        );

    }

    createResult(outcome) {
        return Object.freeze({
            verified:
                outcome ===
                SevenDaysToDieIdentityProofEvaluator.Outcome.VERIFIED,
            outcome
        });
    }

}

SevenDaysToDieIdentityProofEvaluator.Outcome = Object.freeze({
    VERIFIED: "VERIFIED",
    NOT_VERIFIED: "NOT_VERIFIED",
    AMBIGUOUS: "AMBIGUOUS"
});

module.exports = SevenDaysToDieIdentityProofEvaluator;
