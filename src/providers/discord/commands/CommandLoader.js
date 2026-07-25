const BanCommand = require("./BanCommand");
const HelpCommand = require("./HelpCommand");
const KickCommand = require("./KickCommand");
const PingCommand = require("./PingCommand");
const PurgeCommand = require("./PurgeCommand");
const TimeoutCommand = require("./TimeoutCommand");
const UntimeoutCommand = require("./UntimeoutCommand");
const WarnCommand = require("./WarnCommand");

class CommandLoader {

    load() {

        return [
            new BanCommand(),
            new HelpCommand(),
            new KickCommand(),
            new PingCommand(),
            new PurgeCommand(),
            new TimeoutCommand(),
            new UntimeoutCommand(),
            new WarnCommand()
        ];

    }

}

module.exports = new CommandLoader();