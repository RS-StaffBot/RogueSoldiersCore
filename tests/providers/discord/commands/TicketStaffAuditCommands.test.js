const assert = require("node:assert/strict");
const test = require("node:test");

const TicketCommand = require(
    "../../../../src/providers/discord/commands/TicketCommand"
);
const TicketStaffCommandHandler = require(
    "../../../../src/providers/discord/commands/TicketStaffCommandHandler"
);

function createInteraction({
    ticketId = "ticket-1",
    content = "private Ticket message",
    assigneeId = "staff-2"
} = {}) {
    const replies = [];

    return {
        interaction: {
            memberPermissions: {
                has() {
                    return true;
                }
            },
            options: {
                getString(name) {
                    if (name === "id") {
                        return ticketId;
                    }

                    if (name === "content") {
                        return content;
                    }

                    return null;
                },
                getUser() {
                    return {
                        id: assigneeId
                    };
                }
            },
            user: {
                id: "staff-1"
            },
            async reply(payload) {
                replies.push(payload);
            }
        },
        replies
    };
}

function createAudit(attempts, shouldThrow = false) {
    return {
        recordAttempt(details) {
            attempts.push(details);

            if (shouldThrow) {
                throw new Error("private Audit failure");
            }

            return true;
        }
    };
}

test("audits each successful privileged Ticket staff mutation", async () => {
    const cases = [
        {
            subcommand: "message",
            tickets: {
                addMessage() {
                    return {
                        id: "ticket-message-1",
                        ticketId: "ticket-1"
                    };
                }
            }
        },
        {
            subcommand: "assign",
            tickets: {
                assignTicket() {
                    return {
                        id: "ticket-1",
                        assigneeId: "staff-2"
                    };
                }
            }
        },
        {
            subcommand: "unassign",
            tickets: {
                unassignTicket() {
                    return {
                        id: "ticket-1"
                    };
                }
            }
        },
        {
            subcommand: "close",
            tickets: {
                closeTicket() {
                    return {
                        id: "ticket-1"
                    };
                }
            }
        }
    ];

    for (const current of cases) {
        const attempts = [];
        const { interaction, replies } = createInteraction();

        await TicketStaffCommandHandler.execute(
            interaction,
            current.tickets,
            current.subcommand,
            createAudit(attempts)
        );

        assert.deepEqual(attempts, [{
            actorId: "staff-1",
            action: current.subcommand,
            targetId: "ticket-1",
            outcome: "SUCCESS",
            status: "succeeded"
        }]);
        assert.equal(replies.length, 1);
    }
});

test("records success only after the Ticket mutation commits", async () => {
    const order = [];
    const { interaction } = createInteraction();

    await TicketStaffCommandHandler.execute(
        interaction,
        {
            addMessage() {
                order.push("ticket-commit");

                return {
                    id: "ticket-message-1",
                    ticketId: "ticket-1"
                };
            }
        },
        "message",
        {
            recordAttempt() {
                order.push("audit-record");
            }
        }
    );

    assert.deepEqual(order, [
        "ticket-commit",
        "audit-record"
    ]);
});

test("maps known Ticket failures to fixed sanitized statuses", async () => {
    const cases = [
        {
            error:
                "Ticket assignment permission is required.",
            outcome: "DENIED",
            status: "permission-denied",
            rejects: false
        },
        {
            error: "Ticket ID is required.",
            outcome: "FAILED",
            status: "validation-failed",
            rejects: false
        },
        {
            error: "Ticket not found: ticket-1",
            outcome: "FAILED",
            status: "ticket-not-found",
            rejects: false
        },
        {
            error:
                "Ticket assignments require an open ticket.",
            outcome: "FAILED",
            status: "ticket-not-open",
            rejects: false
        },
        {
            error:
                "Ticket is already assigned to: staff-2",
            outcome: "FAILED",
            status: "already-assigned",
            rejects: false
        },
        {
            error: "Ticket is not assigned.",
            outcome: "FAILED",
            status: "not-assigned",
            rejects: false
        },
        {
            error: "private Ticket persistence failure",
            outcome: "FAILED",
            status: "persistence-failed",
            rejects: true
        }
    ];

    for (const current of cases) {
        const attempts = [];
        const { interaction } = createInteraction();

        const execution = TicketStaffCommandHandler.execute(
            interaction,
            {
                assignTicket() {
                    throw new Error(current.error);
                }
            },
            "assign",
            createAudit(attempts)
        );

        if (current.rejects) {
            await assert.rejects(execution, {
                message: current.error
            });
        } else {
            await execution;
        }

        assert.deepEqual(attempts, [{
            actorId: "staff-1",
            action: "assign",
            targetId: "ticket-1",
            outcome: current.outcome,
            status: current.status
        }]);
    }
});

test("Audit failure cannot change Ticket mutation behavior", async () => {
    const attempts = [];
    const { interaction, replies } = createInteraction();

    await TicketStaffCommandHandler.execute(
        interaction,
        {
            closeTicket() {
                return {
                    id: "ticket-1"
                };
            }
        },
        "close",
        createAudit(attempts, true)
    );

    assert.equal(attempts.length, 1);
    assert.equal(replies.length, 1);
    assert.equal(
        replies[0].content,
        "Closed ticket **ticket-1**."
    );
});

test("does not audit staff list or view operations", async () => {
    const attempts = [];
    const list = createInteraction();
    const view = createInteraction();

    await TicketStaffCommandHandler.execute(
        list.interaction,
        {
            listTickets() {
                return [];
            },
            getTicketCount() {
                return 0;
            }
        },
        "list",
        createAudit(attempts)
    );

    await TicketStaffCommandHandler.execute(
        view.interaction,
        {
            getTicket() {
                return null;
            }
        },
        "view",
        createAudit(attempts)
    );

    assert.deepEqual(attempts, []);
    assert.equal(list.replies.length, 1);
    assert.equal(view.replies.length, 1);
});

test("never copies Ticket content or assignee into Audit attempts", async () => {
    const attempts = [];
    const { interaction } = createInteraction();

    await TicketStaffCommandHandler.execute(
        interaction,
        {
            addMessage() {
                return {
                    id: "ticket-message-1",
                    ticketId: "ticket-1"
                };
            }
        },
        "message",
        createAudit(attempts)
    );

    assert.doesNotMatch(
        JSON.stringify(attempts),
        /private Ticket message|staff-2/iu
    );
});

test("TicketCommand validates its optional Audit boundary", () => {
    const boundary = {
        recordAttempt() {}
    };
    const command = new TicketCommand({
        auditService: boundary
    });

    assert.equal(command.auditService, boundary);
    assert.equal(
        new TicketCommand().auditService,
        null
    );

    assert.throws(
        () => new TicketCommand({
            auditService: {}
        }),
        {
            message:
                "Discord Ticket audit boundary is invalid."
        }
    );
});

test("uses a fixed target for malformed Ticket IDs", async () => {
    const attempts = [];
    const { interaction } = createInteraction({
        ticketId: "private arbitrary input"
    });

    const execution = TicketStaffCommandHandler.execute(
        interaction,
        {
            assignTicket() {
                throw new Error("Ticket ID is required.");
            }
        },
        "assign",
        createAudit(attempts)
    );

    await execution;

    assert.deepEqual(attempts, [{
        actorId: "staff-1",
        action: "assign",
        targetId: "unresolved-ticket",
        outcome: "FAILED",
        status: "validation-failed"
    }]);

    assert.doesNotMatch(
        JSON.stringify(attempts),
        /private arbitrary input/iu
    );
});