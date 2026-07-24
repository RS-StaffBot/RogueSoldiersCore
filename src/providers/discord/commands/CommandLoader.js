const PingCommand = require("./PingCommand");

class CommandLoader {

    load() {

        return [
            new PingCommand()
        ];

    }

}

module.exports = new CommandLoader();