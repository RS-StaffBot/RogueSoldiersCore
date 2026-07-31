const test = require("node:test");
const assert = require("node:assert/strict");
const IdentityLinkContract = require(
    "../../../src/modules/identity/IdentityLinkContract"
);
const IdentityPermission = require(
    "../../../src/shared/permissions/IdentityPermission"
);

test("defines a frozen one-to-one active identity contract", () => {

    assert.equal(IdentityLinkContract.moduleName, "Identity");
    assert.equal(
        IdentityLinkContract.activeCardinality.linksPerDiscordUser,
        1
    );
    assert.equal(
        IdentityLinkContract.activeCardinality
            .discordUsersPerGameIdentity,
        1
    );
    assert.deepEqual(
        IdentityLinkContract.supportedGameIdentityPrefixes,
        ["Steam_", "EOS_"]
    );
    assert.deepEqual(
        Object.values(IdentityLinkContract.statuses),
        ["PENDING", "VERIFIED", "REVOKED"]
    );
    assert.ok(Object.isFrozen(IdentityLinkContract));
    assert.ok(
        Object.isFrozen(
            IdentityLinkContract.activeCardinality
        )
    );
    assert.ok(
        Object.isFrozen(
            IdentityLinkContract.statuses
        )
    );

});

test("requires atomic revoke-and-pend replacement semantics", () => {

    assert.deepEqual(
        IdentityLinkContract.replacement,
        {
            revokeCurrentLink: true,
            createPendingReplacement: true,
            atomicPersistenceRequired: true
        }
    );
    assert.ok(
        Object.isFrozen(IdentityLinkContract.replacement)
    );

});

test("keeps ordinary member visibility free of platform identifiers", () => {

    assert.deepEqual(
        IdentityLinkContract.ordinaryMemberVisibility,
        [
            "status",
            "createdAt",
            "verifiedAt",
            "revokedAt"
        ]
    );
    assert.equal(
        IdentityLinkContract.ordinaryMemberVisibility
            .includes("discordUserId"),
        false
    );
    assert.equal(
        IdentityLinkContract.ordinaryMemberVisibility
            .includes("gameUserId"),
        false
    );
    assert.equal(
        IdentityLinkContract.staffIdentifierVisibility,
        "PRIVATE_AUTHORIZED_ONLY"
    );

});

test("defines the narrow future persistence boundary", () => {

    assert.deepEqual(
        IdentityLinkContract.requiredStoreMethods,
        [
            "createLink",
            "getLinkById",
            "getActiveLinkByDiscordUserId",
            "getActiveLinkByGameUserId",
            "replaceLink",
            "listLinks"
        ]
    );
    assert.equal(
        new Set(
            IdentityLinkContract.requiredStoreMethods
        ).size,
        IdentityLinkContract.requiredStoreMethods.length
    );
    assert.ok(
        Object.isFrozen(
            IdentityLinkContract.requiredStoreMethods
        )
    );

});

test("defines frozen reusable identity permissions", () => {

    assert.deepEqual(IdentityPermission, {
        CREATE_OWN: "identity.create-own",
        CONFIRM: "identity.confirm",
        VIEW_ANY: "identity.view-any",
        REPLACE: "identity.replace",
        REVOKE: "identity.revoke",
        ADMINISTRATE: "identity.administrate"
    });
    assert.equal(
        new Set(Object.values(IdentityPermission)).size,
        Object.values(IdentityPermission).length
    );
    assert.ok(Object.isFrozen(IdentityPermission));

});
