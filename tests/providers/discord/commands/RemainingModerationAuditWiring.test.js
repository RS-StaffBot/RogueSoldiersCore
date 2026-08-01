const assert = require("node:assert/strict");
const test = require("node:test");

const CommandLoader = require(
    "../../../../src/providers/discord/commands/CommandLoader"
);
const DiscordProvider = require(
    "../../../../src/providers/discord/DiscordProvider"
);

function createLoaderOptions(overrides = {}) {
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

test("CommandLoader injects one moderation Audit boundary into all six moderation commands", () => {
    const moderationAuditService = Object.freeze({
        recordAttempt() {}
    });
    const commands = CommandLoader.load(
        createLoaderOptions({
            moderationAuditService
        })
    );
    const moderationNames = new Set([
        "ban",
        "kick",
        "purge",
        "timeout",
        "untimeout",
        "warn"
    ]);

    for (const command of commands) {
        if (moderationNames.has(command.data.name)) {
            assert.equal(
                command.auditService,
                moderationAuditService,
                `${command.data.name} did not receive the shared boundary`
            );
        }
    }
});

test("complete command list remains unchanged", () => {
    const names = CommandLoader.load(
        createLoaderOptions()
    )
        .map(command => command.data.name)
        .sort();

    assert.deepEqual(names, [
        "balance",
        "ban",
        "daily",
        "game",
        "help",
        "kick",
        "leaderboard",
        "ping",
        "purge",
        "ticket",
        "timeout",
        "untimeout",
        "warn"
    ]);
});

test("DiscordProvider forwards its moderation Audit boundary to CommandLoader", () => {
    const moderationAuditService = Object.freeze({
        recordAttempt() {}
    });
    let loadOptions;

    const provider = new DiscordProvider({
        commandLoader: {
            load(options) {
                loadOptions = options;
                return [];
            }
        },
        commandRegistry: {
            clear() {},
            getAll() {
                return [];
            },
            register() {}
        },
        createClient() {
            return {};
        },
        interactionHandler: {
            register() {}
        },
        logger: {
            info() {}
        },
        moderationAuditService
    });

    provider.initialize();

    assert.equal(
        loadOptions.moderationAuditService,
        moderationAuditService
    );
});
