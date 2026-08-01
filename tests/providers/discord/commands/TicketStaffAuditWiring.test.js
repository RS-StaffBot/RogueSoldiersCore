const assert = require("node:assert/strict");
const test = require("node:test");

const CommandLoader = require(
    "../../../../src/providers/discord/commands/CommandLoader"
);
const ProviderLoader = require(
    "../../../../src/providers/core/ProviderLoader"
);

function createCommandLoaderOptions(overrides = {}) {
    return {
        gameCommandAuthorizer: {
            getRequiredPermission() {
                return 32n;
            },
            isAuthorized() {
                return true;
            }
        },
        gameServerProviderResolver: {
            resolve() {
                return Object.freeze({
                    available: false,
                    reason: "unavailable"
                });
            }
        },
        ...overrides
    };
}

test("CommandLoader injects the Ticket Audit boundary", () => {
    const ticketAuditService = Object.freeze({
        recordAttempt() {}
    });

    const commands = CommandLoader.load(
        createCommandLoaderOptions({
            ticketAuditService
        })
    );

    const ticketCommand = commands.find(
        command => command.data.name === "ticket"
    );

    assert.ok(ticketCommand);
    assert.equal(
        ticketCommand.auditService,
        ticketAuditService
    );
});

test("ProviderLoader creates a frozen Ticket Audit boundary", () => {
    const records = [];

    const services =
        ProviderLoader.createDiscordAuditServices({
            get(name) {
                assert.equal(name, "Audit");

                return {
                    recordAction(record) {
                        records.push(record);
                        return record;
                    }
                };
            }
        });

    assert.equal(
        typeof services.ticket.recordAttempt,
        "function"
    );
    assert.equal(
        Object.isFrozen(services.ticket),
        true
    );

    services.ticket.recordAttempt({
        actorId: "staff-1",
        action: "close",
        targetId: "ticket-1",
        outcome: "SUCCESS",
        status: "succeeded"
    });

    assert.equal(records.length, 1);
    assert.equal(
        records[0].action,
        "ticket.staff.close"
    );
});

test("ProviderLoader omits Ticket Audit when Audit is unavailable", () => {
    const services =
        ProviderLoader.createDiscordAuditServices({
            get() {
                throw new Error(
                    "Audit Module is unavailable."
                );
            }
        });

    assert.equal(services.ticket, undefined);
});