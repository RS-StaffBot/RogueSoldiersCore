const EconomyTransferPolicy = require("./EconomyTransferPolicy");

class EconomySettingsValidator {

    constructor(economyModule) {

        if (!economyModule || economyModule.name !== "Economy") {
            throw new Error(
                "Economy settings validator requires the Economy Module."
            );
        }

        this.economyModule = economyModule;

    }

    requirePositiveInteger(value, fieldName) {

        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new Error(
                `Economy ${fieldName} must be a positive safe integer.`
            );
        }

    }

    validate(settingKey, value) {

        switch (settingKey) {
            case "economy.startingBalance":
                if (!Number.isSafeInteger(value) || value < 0) {
                    throw new Error(
                        "Economy starting balance must be a " +
                        "non-negative safe integer."
                    );
                }
                break;
            case "economy.dailyReward":
                this.requirePositiveInteger(value, "daily reward");
                break;
            case "economy.dailyCooldownMilliseconds":
                this.requirePositiveInteger(value, "daily cooldown");
                break;
            case "economy.leaderboardLimit":
                this.requirePositiveInteger(value, "leaderboard limit");
                if (value > this.economyModule.maximumLeaderboardLimit) {
                    throw new Error(
                        "Economy leaderboard limit cannot exceed the maximum."
                    );
                }
                break;
            case "economy.transactionPageLimit":
                this.requirePositiveInteger(value, "transaction page limit");
                if (value > this.economyModule.maximumTransactionPageSize) {
                    throw new Error(
                        "Economy transaction page limit cannot exceed the maximum."
                    );
                }
                break;
            case "economy.transferPolicy":
                if (!Object.values(EconomyTransferPolicy).includes(value)) {
                    throw new Error(
                        `Unsupported economy transfer policy: ${value}`
                    );
                }
                break;
            default:
                throw new Error(
                    `Unsupported Economy setting: ${settingKey}`
                );
        }

        return value;

    }

}

module.exports = EconomySettingsValidator;
