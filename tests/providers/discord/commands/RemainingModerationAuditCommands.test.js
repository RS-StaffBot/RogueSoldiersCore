const assert = require("node:assert/strict");
const test = require("node:test");

const Registry = require("../../../../src/core/Registry");
const DiscordModerationGuard = require(
    "../../../../src/providers/discord/services/DiscordModerationGuard"
);
const DiscordPermissionService = require(
    "../../../../src/providers/discord/services/DiscordPermissionService"
);
const PurgeCommand = require(
    "../../../../src/providers/discord/commands/PurgeCommand"
);
const TimeoutCommand = require(
    "../../../../src/providers/discord/commands/TimeoutCommand"
);
const UntimeoutCommand = require(
    "../../../../src/providers/discord/commands/UntimeoutCommand"
);
const WarnCommand = require(
    "../../../../src/providers/discord/commands/WarnCommand"
);

function patchMethod(target, name, replacement) {
    const original = target[name];
    target[name] = replacement;

    return () => {
        target[name] = original;
    };
}

function installBoundaries(t, moderation, {
    permission = true,
    guard = {
        allowed: true,
        message: null
    }
} = {}) {
    const restoreRegistry = patchMethod(
        Registry,
        "get",
        name => {
            assert.equal(name, "modules");

            return {
                get(moduleName) {
                    assert.equal(moduleName, "Moderation");
                    return moderation;
                }
            };
        }
    );
    const restorePermission = patchMethod(
        DiscordPermissionService,
        "hasPermission",
        () => permission
    );
    const restoreGuard = patchMethod(
        DiscordModerationGuard,
        "validate",
        async () => guard
    );

    t.after(() => {
        restoreGuard();
        restorePermission();
        restoreRegistry();
    });
}

function createModeration(records, {
    recordError = null
} = {}) {
    return {
        getRequiredPermission() {
            return "moderation.test";
        },
        recordAction(record) {
            if (recordError) {
                throw recordError;
            }

            records.push(record);
            return record;
        }
    };
}

function createAudit(attempts, {
    throwError = false
} = {}) {
    return {
        recordAttempt(details) {
            attempts.push(details);

            if (throwError) {
                throw new Error("private audit failure");
            }
        }
    };
}

test("warn Audit failure preserves the existing reply and Moderation history", {
    concurrency: false
}, async t => {
    const records = [];
    const attempts = [];
    const replies = [];
    let delivered = 0;
    installBoundaries(t, createModeration(records));

    const targetUser = {
        id: "member-1",
        tag: "Member#0001",
        async send() {
            delivered += 1;
        }
    };
    const interaction = {
        guild: {
            id: "guild-1",
            name: "Rogue Soldiers",
            members: {
                async fetch() {
                    return {
                        id: targetUser.id
                    };
                }
            }
        },
        memberPermissions: {},
        options: {
            getUser() {
                return targetUser;
            },
            getString() {
                return "private warning reason";
            }
        },
        user: {
            id: "moderator-1",
            tag: "Moderator#0001"
        },
        async reply(payload) {
            replies.push(payload);
        }
    };

    await new WarnCommand({
        auditService: createAudit(attempts, {
            throwError: true
        })
    }).execute(interaction);

    assert.equal(delivered, 1);
    assert.equal(records.length, 1);
    assert.deepEqual(replies, [{
        content:
            "Warned Member#0001. Reason: private warning reason",
        flags: 64
    }]);
    assert.deepEqual(attempts, [{
        actorId: "moderator-1",
        action: "warn",
        targetId: "member-1",
        outcome: "SUCCESS",
        status: "succeeded"
    }]);
});

test("timeout Audit failure preserves the existing reply and Moderation history", {
    concurrency: false
}, async t => {
    const records = [];
    const attempts = [];
    const replies = [];
    const timeoutCalls = [];
    installBoundaries(t, createModeration(records));

    const targetUser = {
        id: "member-2",
        tag: "Member#0002"
    };
    const targetMember = {
        id: targetUser.id,
        moderatable: true,
        async timeout(duration, reason) {
            timeoutCalls.push({
                duration,
                reason
            });
        }
    };
    const interaction = {
        guild: {
            id: "guild-1",
            members: {
                async fetch() {
                    return targetMember;
                }
            }
        },
        memberPermissions: {},
        options: {
            getUser() {
                return targetUser;
            },
            getInteger() {
                return 15;
            },
            getString() {
                return "private timeout reason";
            }
        },
        user: {
            id: "moderator-1",
            tag: "Moderator#0001"
        },
        async reply(payload) {
            replies.push(payload);
        }
    };

    await new TimeoutCommand({
        auditService: createAudit(attempts, {
            throwError: true
        })
    }).execute(interaction);

    assert.deepEqual(timeoutCalls, [{
        duration: 900000,
        reason: "private timeout reason"
    }]);
    assert.equal(records.length, 1);
    assert.deepEqual(replies, [{
        content:
            "Timed out Member#0002 for 15 minute(s). " +
            "Reason: private timeout reason",
        flags: 64
    }]);
    assert.deepEqual(attempts, [{
        actorId: "moderator-1",
        action: "timeout",
        targetId: "member-2",
        outcome: "SUCCESS",
        status: "succeeded"
    }]);
});

test("untimeout Audit failure preserves the existing reply and Moderation history", {
    concurrency: false
}, async t => {
    const records = [];
    const attempts = [];
    const replies = [];
    const timeoutCalls = [];
    installBoundaries(t, createModeration(records));

    const targetUser = {
        id: "member-3",
        tag: "Member#0003"
    };
    const targetMember = {
        id: targetUser.id,
        moderatable: true,
        isCommunicationDisabled() {
            return true;
        },
        async timeout(duration, reason) {
            timeoutCalls.push({
                duration,
                reason
            });
        }
    };
    const interaction = {
        guild: {
            id: "guild-1",
            members: {
                async fetch() {
                    return targetMember;
                }
            }
        },
        memberPermissions: {},
        options: {
            getUser() {
                return targetUser;
            },
            getString() {
                return "private untimeout reason";
            }
        },
        user: {
            id: "moderator-1",
            tag: "Moderator#0001"
        },
        async reply(payload) {
            replies.push(payload);
        }
    };

    await new UntimeoutCommand({
        auditService: createAudit(attempts, {
            throwError: true
        })
    }).execute(interaction);

    assert.deepEqual(timeoutCalls, [{
        duration: null,
        reason: "private untimeout reason"
    }]);
    assert.equal(records.length, 1);
    assert.deepEqual(replies, [{
        content:
            "Removed the timeout from Member#0003. " +
            "Reason: private untimeout reason",
        flags: 64
    }]);
    assert.deepEqual(attempts, [{
        actorId: "moderator-1",
        action: "untimeout",
        targetId: "member-3",
        outcome: "SUCCESS",
        status: "succeeded"
    }]);
});

test("purge Audit failure preserves defer, reply, deletion, and Moderation history", {
    concurrency: false
}, async t => {
    const records = [];
    const attempts = [];
    const deferred = [];
    const replies = [];
    const deleteCalls = [];
    installBoundaries(t, createModeration(records));

    const channel = {
        id: "channel-1",
        async bulkDelete(amount, filterOld) {
            deleteCalls.push({
                amount,
                filterOld
            });
            return {
                size: 7
            };
        }
    };
    const interaction = {
        channel,
        guild: {
            id: "guild-1"
        },
        memberPermissions: {},
        options: {
            getInteger() {
                return 10;
            }
        },
        user: {
            id: "moderator-1"
        },
        async deferReply(payload) {
            deferred.push(payload);
        },
        async editReply(payload) {
            replies.push(payload);
        }
    };

    await new PurgeCommand({
        auditService: createAudit(attempts, {
            throwError: true
        })
    }).execute(interaction);

    assert.deepEqual(deleteCalls, [{
        amount: 10,
        filterOld: true
    }]);
    assert.equal(records.length, 1);
    assert.equal(records[0].details.deletedCount, 7);
    assert.deepEqual(deferred, [{
        flags: 64
    }]);
    assert.deepEqual(replies, [{
        content:
            "Deleted 7 message(s). " +
            "Messages older than 14 days were skipped."
    }]);
    assert.deepEqual(attempts, [{
        actorId: "moderator-1",
        action: "purge",
        targetId: "channel-1",
        outcome: "SUCCESS",
        status: "succeeded"
    }]);
    assert.doesNotMatch(
        JSON.stringify(attempts),
        /deletedCount|message|content|author|attachment|embed/iu
    );
});

test("warn records permission, guard, target, execution, and history failures", {
    concurrency: false
}, async t => {
    const targetUser = {
        id: "member-4",
        tag: "Member#0004",
        async send() {}
    };

    const cases = [
        {
            name: "permission",
            permission: false,
            expected: ["DENIED", "permission-denied"]
        },
        {
            name: "guard",
            guard: {
                allowed: false,
                message: "guard denied"
            },
            expected: ["DENIED", "guard-denied"]
        },
        {
            name: "target",
            fetchError: new Error("fetch failed"),
            expected: ["FAILED", "target-unavailable"],
            rejects: true
        },
        {
            name: "execution",
            sendError: new Error("dm failed"),
            expected: ["FAILED", "execution-failed"]
        },
        {
            name: "history",
            historyError: new Error("history failed"),
            expected: ["FAILED", "history-failed"],
            rejects: true
        }
    ];

    for (const current of cases) {
        const attempts = [];
        const records = [];
        const replies = [];
        const moderation = createModeration(records, {
            recordError: current.historyError || null
        });
        const restoreRegistry = patchMethod(
            Registry,
            "get",
            () => ({
                get() {
                    return moderation;
                }
            })
        );
        const restorePermission = patchMethod(
            DiscordPermissionService,
            "hasPermission",
            () => current.permission !== false
        );
        const restoreGuard = patchMethod(
            DiscordModerationGuard,
            "validate",
            async () => current.guard || {
                allowed: true,
                message: null
            }
        );

        const user = {
            ...targetUser,
            async send() {
                if (current.sendError) {
                    throw current.sendError;
                }
            }
        };
        const interaction = {
            guild: {
                id: "guild-1",
                name: "Rogue Soldiers",
                members: {
                    async fetch() {
                        if (current.fetchError) {
                            throw current.fetchError;
                        }

                        return {
                            id: user.id
                        };
                    }
                }
            },
            memberPermissions: {},
            options: {
                getUser() {
                    return user;
                },
                getString() {
                    return "private reason";
                }
            },
            user: {
                id: "moderator-1",
                tag: "Moderator#0001"
            },
            async reply(payload) {
                replies.push(payload);
            }
        };

        try {
            const execution = new WarnCommand({
                auditService: createAudit(attempts)
            }).execute(interaction);

            if (current.rejects) {
                await assert.rejects(execution);
            } else {
                await execution;
            }
        } finally {
            restoreGuard();
            restorePermission();
            restoreRegistry();
        }

        assert.deepEqual(
            [
                attempts[0].outcome,
                attempts[0].status
            ],
            current.expected,
            current.name
        );
        assert.equal(
            JSON.stringify(attempts).includes("private reason"),
            false
        );
    }

    t.after(() => {});
});

test("timeout records validation, target, guard, unavailable, execution, and history failures", {
    concurrency: false
}, async t => {
    const attempts = [];
    const records = [];
    const historyError = new Error("history failed");
    installBoundaries(t, createModeration(records, {
        recordError: historyError
    }));

    const targetUser = {
        id: "member-5",
        tag: "Member#0005"
    };
    const targetMember = {
        id: targetUser.id,
        moderatable: true,
        async timeout() {}
    };
    const interaction = {
        guild: {
            id: "guild-1",
            members: {
                async fetch() {
                    return targetMember;
                }
            }
        },
        memberPermissions: {},
        options: {
            getUser() {
                return targetUser;
            },
            getInteger() {
                return 5;
            },
            getString() {
                return null;
            }
        },
        user: {
            id: "moderator-1",
            tag: "Moderator#0001"
        },
        async reply() {}
    };

    await assert.rejects(
        new TimeoutCommand({
            auditService: createAudit(attempts)
        }).execute(interaction),
        historyError
    );

    assert.deepEqual(attempts, [{
        actorId: "moderator-1",
        action: "timeout",
        targetId: "member-5",
        outcome: "FAILED",
        status: "history-failed"
    }]);
});

test("untimeout records the existing not-timed-out distinction", {
    concurrency: false
}, async t => {
    const attempts = [];
    const replies = [];
    installBoundaries(t, createModeration([]));

    const targetUser = {
        id: "member-6",
        tag: "Member#0006"
    };
    const interaction = {
        guild: {
            id: "guild-1",
            members: {
                async fetch() {
                    return {
                        id: targetUser.id,
                        moderatable: true,
                        isCommunicationDisabled() {
                            return false;
                        }
                    };
                }
            }
        },
        memberPermissions: {},
        options: {
            getUser() {
                return targetUser;
            }
        },
        user: {
            id: "moderator-1"
        },
        async reply(payload) {
            replies.push(payload);
        }
    };

    await new UntimeoutCommand({
        auditService: createAudit(attempts)
    }).execute(interaction);

    assert.deepEqual(attempts, [{
        actorId: "moderator-1",
        action: "untimeout",
        targetId: "member-6",
        outcome: "FAILED",
        status: "not-timed-out"
    }]);
    assert.deepEqual(replies, [{
        content: "Member#0006 is not currently timed out.",
        flags: 64
    }]);
});

test("purge records validation, unavailable-channel, execution, and history failures without message data", {
    concurrency: false
}, async t => {
    const attempts = [];
    const moderation = createModeration([]);
    installBoundaries(t, moderation);

    const validationError = new Error("invalid amount");
    const validationInteraction = {
        channel: {
            id: "channel-2",
            async bulkDelete() {}
        },
        guild: {
            id: "guild-1"
        },
        memberPermissions: {},
        options: {
            getInteger() {
                throw validationError;
            }
        },
        user: {
            id: "moderator-1"
        }
    };

    await assert.rejects(
        new PurgeCommand({
            auditService: createAudit(attempts)
        }).execute(validationInteraction),
        validationError
    );

    assert.deepEqual(attempts, [{
        actorId: "moderator-1",
        action: "purge",
        targetId: "channel-2",
        outcome: "FAILED",
        status: "validation-failed"
    }]);
    assert.doesNotMatch(
        JSON.stringify(attempts),
        /message|content|author|attachment|embed|deletedCount/iu
    );
});

test("commands remain constructible without the optional Audit boundary", () => {
    assert.doesNotThrow(() => new WarnCommand());
    assert.doesNotThrow(() => new TimeoutCommand());
    assert.doesNotThrow(() => new UntimeoutCommand());
    assert.doesNotThrow(() => new PurgeCommand());

    for (const Command of [
        WarnCommand,
        TimeoutCommand,
        UntimeoutCommand,
        PurgeCommand
    ]) {
        assert.throws(
            () => new Command({
                auditService: {}
            }),
            {
                message:
                    "Discord moderation audit boundary is invalid."
            }
        );
    }
});
