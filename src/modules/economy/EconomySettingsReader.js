class EconomySettingsReader {

    constructor(economyModule) {

        if (!economyModule || economyModule.name !== "Economy") {
            throw new Error("Economy settings reader requires the Economy Module.");
        }

        this.economyModule = economyModule;

    }

    get(settingKey) {

        switch (settingKey) {
        case "economy.startingBalance":
            return this.economyModule.startingBalance;
        case "economy.dailyReward":
            return this.economyModule.dailyRewardAmount;
        case "economy.dailyCooldownMilliseconds":
            return this.economyModule.dailyCooldownMs;
        case "economy.leaderboardLimit":
            return this.economyModule.defaultLeaderboardLimit;
        case "economy.transactionPageLimit":
            return this.economyModule.defaultTransactionPageSize;
        case "economy.transferPolicy":
            return this.economyModule.transferPolicy;
        default:
            throw new Error(`Unsupported Economy setting: ${settingKey}`);
        }

    }

}

module.exports = EconomySettingsReader;
