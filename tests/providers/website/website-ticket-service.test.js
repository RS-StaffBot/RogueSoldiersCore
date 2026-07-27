const { test } = require("node:test");
const assert = require("node:assert/strict");

const WebsiteTicketService = require(
    "../../../src/providers/website/WebsiteTicketService"
);

function createIdentity(overrides = {}) {

    return Object.freeze({
        actorId: "discord-user-123",
        displayName: "Rogue Soldier",
        permissions: Object.freeze([]),
        ...overrides
    });

}

function createTicket(overrides = {}) {

    return Object.freeze({
        id: "ticket-1",
        creatorId: "discord-user-123",
        assigneeId: null,
        status: "OPEN",
        createdAt: "2026-07-26T12:00:00.000Z",
        internalValue: "must-not-be-returned",
        ...overrides
    });

}

test("requires a Ticket Module resolver", () => {

    assert.throws(
        () => new WebsiteTicketService(),
        /resolver must be a function/
    );

});

test("requires a positive safe list limit", () => {

    const invalidLimits = [
        0,
        -1,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
        "20"
    ];

    for (const listLimit of invalidLimits) {
        assert.throws(
            () => new WebsiteTicketService({
                listLimit,
                resolveTicketModule() {
                    return {};
                }
            }),
            /list limit must be a positive safe integer/
        );
    }

});

test("lists creator-owned Tickets using authenticated identity", () => {

    const calls = [];
    const identity = createIdentity();
    const service = new WebsiteTicketService({
        resolveTicketModule() {
            return {
                listTicketsForCreator(
                    creatorId,
                    actorId,
                    actorPermissions,
                    options
                ) {
                    calls.push({
                        actorId,
                        actorPermissions,
                        creatorId,
                        options
                    });

                    return [createTicket()];
                }
            };
        }
    });

    const result = service.listCreatorTickets(identity);

    assert.deepStrictEqual(calls, [
        {
            actorId: "discord-user-123",
            actorPermissions: [],
            creatorId: "discord-user-123",
            options: {
                latest: true,
                limit: 20,
                offset: 0
            }
        }
    ]);

    assert.deepStrictEqual(result, {
        tickets: [
            {
                ticketId: "ticket-1",
                status: "OPEN",
                createdAt:
                    "2026-07-26T12:00:00.000Z"
            }
        ]
    });

});

test("uses the configured fixed list limit", () => {

    let receivedOptions = null;
    const service = new WebsiteTicketService({
        listLimit: 10,
        resolveTicketModule() {
            return {
                listTicketsForCreator(
                    creatorId,
                    actorId,
                    actorPermissions,
                    options
                ) {
                    receivedOptions = options;

                    return [];
                }
            };
        }
    });

    service.listCreatorTickets(createIdentity());

    assert.deepStrictEqual(
        receivedOptions,
        {
            latest: true,
            limit: 10,
            offset: 0
        }
    );

});

test("returns an empty allowlisted Ticket response", () => {

    const service = new WebsiteTicketService({
        resolveTicketModule() {
            return {
                listTicketsForCreator() {
                    return [];
                }
            };
        }
    });

    assert.deepStrictEqual(
        service.listCreatorTickets(
            createIdentity()
        ),
        {
            tickets: []
        }
    );

});

test("omits internal Ticket fields", () => {

    const service = new WebsiteTicketService({
        resolveTicketModule() {
            return {
                listTicketsForCreator() {
                    return [
                        createTicket({
                            assigneeId: "staff-user",
                            creatorId: "private-creator",
                            staffNote: "private note"
                        })
                    ];
                }
            };
        }
    });

    const result = service.listCreatorTickets(
        createIdentity()
    );
    const ticket = result.tickets[0];

    assert.deepStrictEqual(
        Object.keys(ticket),
        [
            "ticketId",
            "status",
            "createdAt"
        ]
    );

    assert.strictEqual(
        Object.hasOwn(ticket, "creatorId"),
        false
    );
    assert.strictEqual(
        Object.hasOwn(ticket, "assigneeId"),
        false
    );
    assert.strictEqual(
        Object.hasOwn(ticket, "staffNote"),
        false
    );
    assert.strictEqual(
        Object.hasOwn(ticket, "internalValue"),
        false
    );

});

test("returns frozen defensive response objects", () => {

    const ticket = createTicket();
    const service = new WebsiteTicketService({
        resolveTicketModule() {
            return {
                listTicketsForCreator() {
                    return [ticket];
                }
            };
        }
    });

    const result = service.listCreatorTickets(
        createIdentity()
    );

    assert.strictEqual(
        Object.isFrozen(result),
        true
    );
    assert.strictEqual(
        Object.isFrozen(result.tickets),
        true
    );
    assert.strictEqual(
        Object.isFrozen(result.tickets[0]),
        true
    );
    assert.notStrictEqual(
        result.tickets[0],
        ticket
    );

});

test("rejects invalid authenticated identities", () => {

    const service = new WebsiteTicketService({
        resolveTicketModule() {
            throw new Error(
                "Resolver must not be reached."
            );
        }
    });
    const invalidIdentities = [
        null,
        [],
        {},
        {
            actorId: "",
            permissions: []
        },
        {
            actorId: "actor",
            permissions: null
        }
    ];

    for (const identity of invalidIdentities) {
        assert.throws(
            () => service.listCreatorTickets(identity),
            error =>
                error.code === "INVALID_IDENTITY" &&
                error.message ===
                    "Website Ticket identity is invalid."
        );
    }

});

test("reports an unavailable Ticket Module safely", () => {

    const unavailableValues = [
        null,
        {},
        {
            listTicketsForCreator: "invalid"
        }
    ];

    for (const ticketModule of unavailableValues) {

        const service = new WebsiteTicketService({
            resolveTicketModule() {
                return ticketModule;
            }
        });

        assert.throws(
            () => service.listCreatorTickets(
                createIdentity()
            ),
            error =>
                error.code ===
                    "TICKET_MODULE_UNAVAILABLE" &&
                error.message ===
                    "Website Ticket Module is unavailable."
        );

    }

});

test("normalizes Ticket Module failures", () => {

    const service = new WebsiteTicketService({
        resolveTicketModule() {
            return {
                listTicketsForCreator() {
                    throw new Error(
                        "Sensitive database details."
                    );
                }
            };
        }
    });

    assert.throws(
        () => service.listCreatorTickets(
            createIdentity()
        ),
        error =>
            error.code ===
                "TICKET_OPERATION_FAILED" &&
            error.message ===
                "Website Ticket listing failed." &&
            !error.message.includes("database")
    );

});

test("rejects invalid Ticket Module responses", () => {

    const invalidResponses = [
        null,
        {},
        [
            {
                id: "",
                status: "OPEN",
                createdAt:
                    "2026-07-26T12:00:00.000Z"
            }
        ],
        [
            {
                id: "ticket-1",
                status: "",
                createdAt:
                    "2026-07-26T12:00:00.000Z"
            }
        ],
        [
            {
                id: "ticket-1",
                status: "OPEN",
                createdAt: "invalid-date"
            }
        ]
    ];

    for (const response of invalidResponses) {

        const service = new WebsiteTicketService({
            resolveTicketModule() {
                return {
                    listTicketsForCreator() {
                        return response;
                    }
                };
            }
        });

        assert.throws(
            () => service.listCreatorTickets(
                createIdentity()
            ),
            error =>
                error.code ===
                    "TICKET_OPERATION_FAILED"
        );

    }

});

test("does not accept request-controlled creator or actor values", () => {

    const calls = [];
    const identity = createIdentity();
    const untrustedRequestValues = {
        actorId: "attacker",
        creatorId: "another-user",
        permissions: ["tickets.viewAll"]
    };
    const service = new WebsiteTicketService({
        resolveTicketModule() {
            return {
                listTicketsForCreator(
                    creatorId,
                    actorId,
                    actorPermissions
                ) {
                    calls.push({
                        actorId,
                        actorPermissions,
                        creatorId
                    });

                    return [];
                }
            };
        }
    });

    service.listCreatorTickets(
        identity,
        untrustedRequestValues
    );

    assert.deepStrictEqual(calls, [
        {
            actorId: identity.actorId,
            actorPermissions:
                identity.permissions,
            creatorId: identity.actorId
        }
    ]);

});