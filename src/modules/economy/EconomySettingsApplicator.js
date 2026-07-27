const EconomyTransferPolicy = require("./EconomyTransferPolicy");

class EconomySettingsApplicator {

    constructor(economyModule) {

        if (!economyModule || economyModule.name !== "Economy") {
            throw new Error(
                "Economy settings applicator requires the Economy Module."
            );
        }

        this.economyModule = economyModule;
        this.defaults = Object.freeze({
            "economy.startingBalance": 0,
            "economy.dailyReward": 100,
            "economy.dailyCooldownMilliseconds": 24 * 60 * 60 * 1000,
            "economy.leaderboardLimit": 10,
            "economy.transactionPageLimit": 25,
            "economy.transferPolicy": EconomyTransferPolicy.STAFF_ONLY
        });

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

    getDefault(settingKey) {

        if (!Object.hasOwn(this.defaults, settingKey)) {
            throw new Error(`Unsupported Economy setting: ${settingKey}`);
        }

        return this.defaults[settingKey];

    }

    apply(settingKey, value) {

        switch (settingKey) {
            case "economy.startingBalance":
                this.economyModule.startingBalance = value;
                break;
            case "economy.dailyReward":
                this.economyModule.dailyRewardAmount = value;
                break;
            case "economy.dailyCooldownMilliseconds":
                this.economyModule.dailyCooldownMs = value;
                break;
            case "economy.leaderboardLimit":
                this.economyModule.defaultLeaderboardLimit = value;
                break;
            case "economy.transactionPageLimit":
                this.economyModule.defaultTransactionPageSize = value;
                break;
            case "economy.transferPolicy":
                this.economyModule.transferPolicy = value;
                break;
            default:
                throw new Error(`Unsupported Economy setting: ${settingKey}`);
        }

        return this.get(settingKey);

    }

    restore(settingKey, value) {

        return this.apply(settingKey, value);

    }

}

module.exports = EconomySettingsApplicator;
