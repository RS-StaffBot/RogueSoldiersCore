const HelpCommand = require("./HelpCommand");
const PingCommand = require("./PingCommand");

class CommandLoader {

    load() {

        return [
            new HelpCommand(),
            new PingCommand()
        ];

    }

}

module.exports = new CommandLoader();