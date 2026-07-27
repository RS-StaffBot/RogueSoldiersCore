const SettingValueType = require(
    "../../core/settings/SettingValueType"
);
const EconomyModule = require("./EconomyModule");
const EconomySettingDefinitions = require(
    "./EconomySettingDefinitions"
);
const EconomySettingsValidator = require(
    "./EconomySettingsValidator"
);

class EconomySettingsResolver {

    constructor({ store, validator = null } = {}) {

        if (!store || typeof store.list !== "function") {
            throw new Error("Economy settings resolver requires a settings store.");
        }

        this.store = store;
        this.definitions = new Map(
            EconomySettingDefinitions.map(definition => [
                definition.key,
                definition
            ])
        );
        this.validator = validator || new EconomySettingsValidator(
            new EconomyModule()
        );

    }

    validateValueType(definition, value) {

        if (
            definition.valueType === SettingValueType.INTEGER &&
            !Number.isSafeInteger(value)
        ) {
            throw new Error(
                `Stored setting ${definition.key} must be a safe integer.`
            );
        }

        if (
            definition.valueType === SettingValueType.STRING &&
            typeof value !== "string"
        ) {
            throw new Error(
                `Stored setting ${definition.key} must be a string.`
            );
        }

        if (
            definition.valueType === SettingValueType.BOOLEAN &&
            typeof value !== "boolean"
        ) {
            throw new Error(
                `Stored setting ${definition.key} must be boolean.`
            );
        }

    }

    mapOption(settingKey, value, options) {

        switch (settingKey) {
            case "economy.startingBalance":
                options.startingBalance = value;
                break;
            case "economy.dailyReward":
                options.dailyRewardAmount = value;
                break;
            case "economy.dailyCooldownMilliseconds":
                options.dailyCooldownMs = value;
                break;
            case "economy.leaderboardLimit":
                options.defaultLeaderboardLimit = value;
                break;
            case "economy.transactionPageLimit":
                options.defaultTransactionPageSize = value;
                break;
            case "economy.transferPolicy":
                options.transferPolicy = value;
                break;
            default:
                throw new Error(
                    `Unsupported Economy setting: ${settingKey}`
                );
        }

    }

    resolve() {

        const options = {};

        for (const record of this.store.list()) {
            const definition = this.definitions.get(record.settingKey);

            if (!definition) {
                if (record.settingKey.startsWith("economy.")) {
                    throw new Error(
                        `Unknown stored Economy setting: ${record.settingKey}`
                    );
                }

                continue;
            }

            if (record.valueType !== definition.valueType) {
                throw new Error(
                    "Stored setting type does not match definition: " +
                    record.settingKey
                );
            }

            this.validateValueType(definition, record.value);
            this.validator.validate(record.settingKey, record.value);
            this.mapOption(record.settingKey, record.value, options);
        }

        return Object.freeze(options);

    }

}

module.exports = EconomySettingsResolver;
