const HelpCommand = require("./HelpCommand");
const KickCommand = require("./KickCommand");
const PingCommand = require("./PingCommand");

class CommandLoader {

    load() {

        return [
            new HelpCommand(),
            new KickCommand(),
            new PingCommand()
        ];

    }

}

module.exports = new CommandLoader();