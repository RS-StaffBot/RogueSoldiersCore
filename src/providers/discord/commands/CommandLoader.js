const BanCommand = require("./BanCommand");
const BalanceCommand = require("./BalanceCommand");
const DailyCommand = require("./DailyCommand");
const GameCommand = require("./GameCommand");
const HelpCommand = require("./HelpCommand");
const KickCommand = require("./KickCommand");
const LeaderboardCommand = require("./LeaderboardCommand");
const PingCommand = require("./PingCommand");
const PurgeCommand = require("./PurgeCommand");
const TicketCommand = require("./TicketCommand");
const TimeoutCommand = require("./TimeoutCommand");
const UntimeoutCommand = require("./UntimeoutCommand");
const WarnCommand = require("./WarnCommand");

class CommandLoader {

    load({
        gameCommandAuthorizer,
        gameServerProviderResolver
    } = {}) {

        return [
            new BanCommand(),
            new BalanceCommand(),
            new DailyCommand(),
            new GameCommand({
                gameCommandAuthorizer,
                gameServerProviderResolver
            }),
            new HelpCommand(),
            new KickCommand(),
            new LeaderboardCommand(),
            new PingCommand(),
            new PurgeCommand(),
            new TicketCommand(),
            new TimeoutCommand(),
            new UntimeoutCommand(),
            new WarnCommand()
        ];

    }

}

module.exports = new CommandLoader();
