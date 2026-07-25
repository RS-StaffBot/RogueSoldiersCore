const BanCommand = require("./BanCommand");
const HelpCommand = require("./HelpCommand");
const KickCommand = require("./KickCommand");
const PingCommand = require("./PingCommand");
const TimeoutCommand = require("./TimeoutCommand");

class CommandLoader {

    load() {

        return [
            new BanCommand(),
            new HelpCommand(),
            new KickCommand(),
            new PingCommand(),
            new TimeoutCommand()
        ];

    }

}

module.exports = new CommandLoader();