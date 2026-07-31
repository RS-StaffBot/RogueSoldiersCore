const assert = require("node:assert/strict");
const test = require("node:test");

const IdentityLinkError = require(
    "../../../src/modules/identity/IdentityLinkError"
);
const IdentityLinkRecord = require(
    "../../../src/modules/identity/IdentityLinkRecord"
);
const IdentityLinkStatus = require(
    "../../../src/modules/identity/IdentityLinkStatus"
);
const InMemoryIdentityStore = require(
    "../../../src/modules/identity/persistence/" +
    "InMemoryIdentityStore"
);

function createRecord(overrides = {}) {
    return new IdentityLinkRecord({
        id: "identity-link-pending",
        discordUserId: "123456789012345678",
        gameUserId: "EOS_abc123",
        createdAt: new Date("2026-07-31T01:00:00.000Z"),
        ...overrides
    });
}

function toStored(record) {
    return {
        id: record.id,
        discordUserId: record.discordUserId,
        gameUserId: record.gameUserId,
        status: record.status,
        createdAt: record.createdAt,
        verifiedAt: record.verifiedAt,
        revokedAt: record.revokedAt
    };
}

test("creates immutable pending, verified, and revoked records", () => {
    const pending = createRecord();
    const verified = createRecord({
        status: IdentityLinkStatus.VERIFIED,
        verifiedAt: new Date("2026-07-31T01:01:00.000Z")
    });
    const revoked = createRecord({
        status: IdentityLinkStatus.REVOKED,
        revokedAt: new Date("2026-07-31T01:02:00.000Z")
    });

    assert.equal(Object.isFrozen(pending), true);
    assert.equal(verified.status, IdentityLinkStatus.VERIFIED);
    assert.equal(revoked.status, IdentityLinkStatus.REVOKED);
});

test("rejects invalid identifiers and inconsistent status dates", () => {
    assert.throws(() => createRecord({ gameUserId: "Player One" }));
    assert.throws(() => createRecord({ gameUserId: "EOS_bad id" }));
    assert.throws(() => createRecord({ verifiedAt: new Date() }));
    assert.throws(() => createRecord({
        status: IdentityLinkStatus.VERIFIED
    }));
    assert.throws(() => createRecord({
        status: IdentityLinkStatus.REVOKED
    }));
});

test("creates and retrieves defensive identity links", () => {
    const store = new InMemoryIdentityStore();
    const created = store.createLink(toStored(createRecord()));

    assert.equal(created.id, "identity-link-1");
    created.status = IdentityLinkStatus.REVOKED;

    assert.equal(
        store.getLinkById(created.id).status,
        IdentityLinkStatus.PENDING
    );
    assert.notStrictEqual(store.listLinks()[0], created);
});

test("enforces active Discord and game identity uniqueness", () => {
    const store = new InMemoryIdentityStore();

    store.createLink(toStored(createRecord()));

    assert.throws(
        () => store.createLink(toStored(createRecord({
            gameUserId: "Steam_123"
        }))),
        error =>
            error instanceof IdentityLinkError &&
            error.code ===
                IdentityLinkError.Code.DISCORD_CONFLICT
    );

    assert.throws(
        () => store.createLink(toStored(createRecord({
            discordUserId: "223456789012345678"
        }))),
        error =>
            error instanceof IdentityLinkError &&
            error.code === IdentityLinkError.Code.GAME_CONFLICT
    );
});

test("atomically revokes and creates a pending replacement", () => {
    const store = new InMemoryIdentityStore();
    const current = store.createLink(toStored(createRecord({
        status: IdentityLinkStatus.VERIFIED,
        verifiedAt: new Date("2026-07-31T01:01:00.000Z")
    })));
    const revoked = {
        ...current,
        status: IdentityLinkStatus.REVOKED,
        revokedAt: "2026-07-31T01:02:00.000Z"
    };
    const pending = toStored(createRecord({
        gameUserId: "Steam_456"
    }));

    const replacement = store.replaceLink(
        current,
        revoked,
        pending
    );

    assert.equal(replacement.id, "identity-link-2");
    assert.equal(replacement.status, IdentityLinkStatus.PENDING);
    assert.equal(
        store.getLinkById(current.id).status,
        IdentityLinkStatus.REVOKED
    );
    assert.equal(
        store.getActiveLinkByDiscordUserId(
            current.discordUserId
        ).id,
        replacement.id
    );
});

test("rolls back replacement when the new game identity conflicts", () => {
    const store = new InMemoryIdentityStore();
    const current = store.createLink(toStored(createRecord()));

    store.createLink(toStored(createRecord({
        discordUserId: "223456789012345678",
        gameUserId: "Steam_999"
    })));

    assert.throws(() => store.replaceLink(
        current,
        {
            ...current,
            status: IdentityLinkStatus.REVOKED,
            revokedAt: "2026-07-31T01:02:00.000Z"
        },
        toStored(createRecord({ gameUserId: "Steam_999" }))
    ));

    assert.equal(
        store.getLinkById(current.id).status,
        IdentityLinkStatus.PENDING
    );
    assert.equal(store.listLinks().length, 2);
});

test("rejects stale replacement state", () => {
    const store = new InMemoryIdentityStore();
    const current = store.createLink(toStored(createRecord()));

    assert.throws(
        () => store.replaceLink(
            { ...current, status: IdentityLinkStatus.VERIFIED },
            {
                ...current,
                status: IdentityLinkStatus.REVOKED,
                revokedAt: "2026-07-31T01:02:00.000Z"
            },
            toStored(createRecord({ gameUserId: "Steam_456" }))
        ),
        error =>
            error instanceof IdentityLinkError &&
            error.code === IdentityLinkError.Code.STALE_STATE
    );
});
