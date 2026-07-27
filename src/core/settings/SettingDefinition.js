const SettingChangeMode = require("./SettingChangeMode");
const SettingValueType = require("./SettingValueType");

class SettingDefinition {

    constructor({
        key,
        owner,
        valueType,
        changeMode,
        secret = false,
        readPermission,
        updatePermission
    }) {

        this.validateText(key, "key");
        this.validateText(owner, "owner");
        this.validateText(readPermission, "read permission");
        this.validateText(updatePermission, "update permission");

        if (!Object.values(SettingValueType).includes(valueType)) {
            throw new Error(`Unsupported setting value type: ${valueType}`);
        }

        if (!Object.values(SettingChangeMode).includes(changeMode)) {
            throw new Error(`Unsupported setting change mode: ${changeMode}`);
        }

        if (typeof secret !== "boolean") {
            throw new Error("Setting secret classification must be boolean.");
        }

        if (secret !== (changeMode === SettingChangeMode.SECRET)) {
            throw new Error(
                "Secret settings must use the SECRET change mode, and " +
                "SECRET change mode settings must be secret."
            );
        }

        this.key = key;
        this.owner = owner;
        this.valueType = valueType;
        this.changeMode = changeMode;
        this.secret = secret;
        this.readPermission = readPermission;
        this.updatePermission = updatePermission;

        Object.freeze(this);

    }

    validateText(value, fieldName) {

        if (
            typeof value !== "string" ||
            value.trim().length === 0 ||
            value !== value.trim()
        ) {
            throw new Error(`Setting ${fieldName} must be a non-empty trimmed string.`);
        }

    }

    toSnapshot() {

        return Object.freeze({
            key: this.key,
            owner: this.owner,
            valueType: this.valueType,
            changeMode: this.changeMode,
            secret: this.secret,
            readPermission: this.readPermission,
            updatePermission: this.updatePermission
        });

    }

}

module.exports = SettingDefinition;
