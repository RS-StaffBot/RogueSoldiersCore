const BanCommand = require("./BanCommand");
const HelpCommand = require("./HelpCommand");
const KickCommand = require("./KickCommand");
const PingCommand = require("./PingCommand");
const TimeoutCommand = require("./TimeoutCommand");
const UntimeoutCommand = require("./UntimeoutCommand");

class CommandLoader {

    load() {

        return [
            new BanCommand(),
            new HelpCommand(),
            new KickCommand(),
            new PingCommand(),
            new TimeoutCommand(),
            new UntimeoutCommand()
        ];

    }

}

module.exports = new CommandLoader();