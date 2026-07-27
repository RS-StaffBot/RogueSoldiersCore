const SettingDefinition = require(
    "../../core/settings/SettingDefinition"
);
const SettingChangeMode = require(
    "../../core/settings/SettingChangeMode"
);
const SettingValueType = require(
    "../../core/settings/SettingValueType"
);
const SettingsPermission = require(
    "../../shared/permissions/SettingsPermission"
);

const OWNER = "Economy";

const EconomySettingDefinitions = Object.freeze([
    new SettingDefinition({
        key: "economy.startingBalance",
        owner: OWNER,
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE
    }),
    new SettingDefinition({
        key: "economy.dailyReward",
        owner: OWNER,
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE
    }),
    new SettingDefinition({
        key: "economy.dailyCooldownMilliseconds",
        owner: OWNER,
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE
    }),
    new SettingDefinition({
        key: "economy.leaderboardLimit",
        owner: OWNER,
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE
    }),
    new SettingDefinition({
        key: "economy.transactionPageLimit",
        owner: OWNER,
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE
    }),
    new SettingDefinition({
        key: "economy.transferPolicy",
        owner: OWNER,
        valueType: SettingValueType.STRING,
        changeMode: SettingChangeMode.LIVE,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE
    })
]);

module.exports = EconomySettingDefinitions;
