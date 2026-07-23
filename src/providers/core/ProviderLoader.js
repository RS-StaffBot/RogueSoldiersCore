const DiscordProvider = require("../discord/DiscordProvider");

class ProviderLoader {
    load() {
        return [
            new DiscordProvider()
        ];
    }
}

module.exports = new ProviderLoader();