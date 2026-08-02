const AuditCommand = require("./AuditCommand");
const AuditedGameCommand = require("./AuditedGameCommand");
const BanCommand = require("./BanCommand");
const BalanceCommand = require("./BalanceCommand");
const DailyCommand = require("./DailyCommand");
const HelpCommand = require("./HelpCommand");
const IdentityCommand = require("./IdentityCommand");
const KickCommand = require("./KickCommand");
const LeaderboardCommand = require("./LeaderboardCommand");
const LifecycleCommand = require("./LifecycleCommand");
const PingCommand = require("./PingCommand");
const PurgeCommand = require("./PurgeCommand");
const TicketCommand = require("./TicketCommand");
const TimeoutCommand = require("./TimeoutCommand");
const UntimeoutCommand = require("./UntimeoutCommand");
const WarnCommand = require("./WarnCommand");

class CommandLoader {

    load({
        auditAuthorizer,
        auditQueryBoundary,
        gameCommandAuthorizer,
        gameServerProviderResolver,
        hostedPlayerAuditService,
        identityModuleResolver,
        identityProofProviderResolver,
        lifecycleAuditService,
        lifecycleService,
        logger,
        moderationAuditService,
        ticketAuditService
    } = {}) {

        const commands = [
            new BanCommand({
                auditService: moderationAuditService
            }),
            new BalanceCommand(),
            new DailyCommand(),
            new AuditedGameCommand({
                auditService: hostedPlayerAuditService,
                gameCommandAuthorizer,
                gameServerProviderResolver
            }),
            new HelpCommand()
        ];

        if (
            auditAuthorizer !== undefined &&
            auditQueryBoundary !== undefined
        ) {
            commands.unshift(
                new AuditCommand({
                    authorizer: auditAuthorizer,
                    logger,
                    queryBoundary: auditQueryBoundary
                })
            );
        }

        if (identityModuleResolver !== undefined) {
            commands.push(
                new IdentityCommand({
                    identityModuleResolver,
                    identityProofProviderResolver
                })
            );
        }

        commands.push(
            new KickCommand({
                auditService: moderationAuditService
            }),
            new LeaderboardCommand()
        );

        if (lifecycleService !== undefined) {
            commands.push(
                new LifecycleCommand({
                    auditService: lifecycleAuditService,
                    authorizer: gameCommandAuthorizer,
                    lifecycleService
                })
            );
        }

        commands.push(
            new PingCommand(),
            new PurgeCommand({
                auditService: moderationAuditService
            }),
            new TicketCommand({
                auditService: ticketAuditService
            }),
            new TimeoutCommand({
                auditService: moderationAuditService
            }),
            new UntimeoutCommand({
                auditService: moderationAuditService
            }),
            new WarnCommand({
                auditService: moderationAuditService
            })
        );

        return commands;

    }

}

module.exports = new CommandLoader();
