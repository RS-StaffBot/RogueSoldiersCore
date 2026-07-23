const BaseProvider = require("../core/BaseProvider");

class DiscordProvider extends BaseProvider {
    constructor() {
        super("Discord");
    }
}

module.exports = DiscordProvider;