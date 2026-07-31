const SevenDaysToDieIdentityProofContract = Object.freeze({
    providerOperation: "collectIdentityProof",
    method: "SHORT_LIVED_IN_GAME_CHALLENGE",
    challengeLifetimeMilliseconds: 5 * 60 * 1000,
    requiredEvidenceFields: Object.freeze([
        "gameUserId",
        "challenge",
        "observedAt"
    ]),
    allowedEvidenceFields: Object.freeze([
        "gameUserId",
        "challenge",
        "observedAt"
    ]),
    exactMatchRequired: true,
    oneMatchRequired: true,
    displayNameIsProof: false,
    entityIdIsProof: false,
    currentReadOnlyPlayerListsAreSufficient: false,
    temporaryEvidenceRetention: "DISCARD_AFTER_EVALUATION",
    commandExecution: Object.freeze({
        fixedProviderOperationOnly: true,
        singleActiveCommandApplies: true,
        timeoutFailsClosed: true
    }),
    privacy: Object.freeze({
        rawOutputAllowed: false,
        ordinaryIdentifierDisclosureAllowed: false,
        internalErrorDisclosureAllowed: false
    })
});

module.exports = SevenDaysToDieIdentityProofContract;
