const IdentityLinkContract = Object.freeze({
    moduleName: "Identity",
    discordIdentityField: "discordUserId",
    gameIdentityField: "gameUserId",
    supportedGameIdentityPrefixes: Object.freeze([
        "Steam_",
        "EOS_"
    ]),
    statuses: Object.freeze({
        PENDING: "PENDING",
        VERIFIED: "VERIFIED",
        REVOKED: "REVOKED"
    }),
    activeCardinality: Object.freeze({
        linksPerDiscordUser: 1,
        discordUsersPerGameIdentity: 1
    }),
    replacement: Object.freeze({
        revokeCurrentLink: true,
        createPendingReplacement: true,
        atomicPersistenceRequired: true
    }),
    ordinaryMemberVisibility: Object.freeze([
        "status",
        "createdAt",
        "verifiedAt",
        "revokedAt"
    ]),
    staffIdentifierVisibility: "PRIVATE_AUTHORIZED_ONLY",
    requiredStoreMethods: Object.freeze([
        "createLink",
        "getLinkById",
        "getActiveLinkByDiscordUserId",
        "getActiveLinkByGameUserId",
        "replaceLink",
        "listLinks"
    ])
});

module.exports = IdentityLinkContract;
