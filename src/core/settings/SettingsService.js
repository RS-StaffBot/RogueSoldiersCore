const SettingValueType = require("./SettingValueType");
const SettingsPermission = require(
    "../../shared/permissions/SettingsPermission"
);

class SettingsService {

    constructor({
        registry,
        ownerReaders,
        ownerValidators = {},
        store = null,
        auditStore = null,
        now = () => new Date()
    } = {}) {

        if (
            !registry ||
            typeof registry.get !== "function" ||
            typeof registry.list !== "function"
        ) {
            throw new Error("Settings service requires a valid registry.");
        }

        if (
            !ownerReaders ||
            typeof ownerReaders !== "object" ||
            Array.isArray(ownerReaders)
        ) {
            throw new Error("Settings service requires owner readers.");
        }

        if (
            !ownerValidators ||
            typeof ownerValidators !== "object" ||
            Array.isArray(ownerValidators)
        ) {
            throw new Error("Settings service owner validators are invalid.");
        }

        if (
            store !== null &&
            (
                typeof store.save !== "function" ||
                typeof store.get !== "function" ||
                typeof store.delete !== "function"
            )
        ) {
            throw new Error("Settings service store is invalid.");
        }

        if (
            auditStore !== null &&
            (
                typeof auditStore.runTransaction !== "function" ||
                typeof auditStore.record !== "function"
            )
        ) {
            throw new Error("Settings service audit store is invalid.");
        }

        if (typeof now !== "function") {
            throw new Error("Settings service clock is invalid.");
        }

        this.registry = registry;
        this.ownerReaders = Object.freeze({ ...ownerReaders });
        this.ownerValidators = Object.freeze({ ...ownerValidators });
        this.store = store;
        this.auditStore = auditStore;
        this.now = now;

    }

    validateActor(actor) {

        if (
            !actor ||
            typeof actor !== "object" ||
            Array.isArray(actor) ||
            typeof actor.actorId !== "string" ||
            actor.actorId.trim().length === 0 ||
            !Array.isArray(actor.permissions) ||
            actor.permissions.some(
                permission =>
                    typeof permission !== "string" ||
                    permission.trim().length === 0
            )
        ) {
            throw new Error("Settings actor is invalid.");
        }

        return new Set(actor.permissions);

    }

    canRead(definition, permissions) {

        return permissions.has(SettingsPermission.ADMINISTRATE) ||
            permissions.has(definition.readPermission);

    }

    canUpdate(definition, permissions) {

        return permissions.has(SettingsPermission.ADMINISTRATE) ||
            permissions.has(definition.updatePermission);

    }

    createSnapshot(definition, value) {

        if (definition.secret) {
            throw new Error(
                `Secret setting values cannot be read: ${definition.key}`
            );
        }

        return Object.freeze({
            key: definition.key,
            owner: definition.owner,
            valueType: definition.valueType,
            changeMode: definition.changeMode,
            secret: definition.secret,
            value
        });

    }

    readValue(definition) {

        const reader = this.ownerReaders[definition.owner];

        if (!reader || typeof reader.get !== "function") {
            throw new Error(
                `Unsupported setting owner: ${definition.owner}`
            );
        }

        return reader.get(definition.key);

    }

    validateValueType(definition, value) {

        switch (definition.valueType) {
            case SettingValueType.INTEGER:
                if (
                    typeof value !== "number" ||
                    !Number.isSafeInteger(value)
                ) {
                    throw new Error(
                        `Setting ${definition.key} must be a safe integer.`
                    );
                }
                break;
            case SettingValueType.STRING:
                if (typeof value !== "string") {
                    throw new Error(
                        `Setting ${definition.key} must be a string.`
                    );
                }
                break;
            case SettingValueType.BOOLEAN:
                if (typeof value !== "boolean") {
                    throw new Error(
                        `Setting ${definition.key} must be boolean.`
                    );
                }
                break;
            default:
                throw new Error(
                    `Unsupported setting value type: ${definition.valueType}`
                );
        }

    }

    validateOwnerValue(definition, value) {

        const validator = this.ownerValidators[definition.owner];

        if (!validator || typeof validator.validate !== "function") {
            throw new Error(
                `Unsupported setting validator: ${definition.owner}`
            );
        }

        validator.validate(definition.key, value);

    }

    requireMutationDependencies() {

        if (!this.store) {
            throw new Error("Settings mutation store is not configured.");
        }

    }

    getTimestamp() {

        const timestamp = this.now();

        if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
            throw new Error("Settings service clock returned an invalid date.");
        }

        return timestamp.toISOString();

    }

    executeMutation(operation) {

        if (!this.auditStore) {
            return operation();
        }

        return this.auditStore.runTransaction(operation);

    }

    getSetting(actor, settingKey) {

        const permissions = this.validateActor(actor);
        const definition = this.registry.get(settingKey);

        if (!this.canRead(definition, permissions)) {
            throw new Error(`Setting read is not authorized: ${settingKey}`);
        }

        return this.createSnapshot(
            definition,
            this.readValue(definition)
        );

    }

    listSettings(actor) {

        const permissions = this.validateActor(actor);
        const snapshots = [];

        for (const definition of this.registry.list()) {
            if (!this.canRead(definition, permissions)) {
                continue;
            }

            if (definition.secret) {
                continue;
            }

            snapshots.push(
                this.createSnapshot(
                    definition,
                    this.readValue(definition)
                )
            );
        }

        return Object.freeze(snapshots);

    }

    updateSetting(actor, settingKey, value) {

        this.requireMutationDependencies();
        const permissions = this.validateActor(actor);
        const definition = this.registry.get(settingKey);

        if (!this.canUpdate(definition, permissions)) {
            throw new Error(
                `Setting update is not authorized: ${settingKey}`
            );
        }

        if (definition.secret) {
            throw new Error(
                `Secret settings cannot be updated here: ${settingKey}`
            );
        }

        this.validateValueType(definition, value);
        this.validateOwnerValue(definition, value);
        const occurredAt = this.getTimestamp();

        return this.executeMutation(() => {
            const previousRecord = this.store.get(definition.key);
            const newRecord = this.store.save({
                settingKey: definition.key,
                valueType: definition.valueType,
                value,
                updatedAt: occurredAt,
                updatedBy: actor.actorId
            });

            if (this.auditStore) {
                this.auditStore.record({
                    settingKey: definition.key,
                    action: "UPDATE",
                    previousRecord,
                    newRecord,
                    actorId: actor.actorId,
                    occurredAt
                });
            }

            return newRecord;
        });

    }

    resetSetting(actor, settingKey) {

        this.requireMutationDependencies();
        const permissions = this.validateActor(actor);
        const definition = this.registry.get(settingKey);

        if (!this.canUpdate(definition, permissions)) {
            throw new Error(
                `Setting reset is not authorized: ${settingKey}`
            );
        }

        if (definition.secret) {
            throw new Error(
                `Secret settings cannot be reset here: ${settingKey}`
            );
        }

        const occurredAt = this.getTimestamp();

        return this.executeMutation(() => {
            const previousRecord = this.store.get(definition.key);
            const reset = this.store.delete(definition.key);

            if (reset && this.auditStore) {
                this.auditStore.record({
                    settingKey: definition.key,
                    action: "RESET",
                    previousRecord,
                    newRecord: null,
                    actorId: actor.actorId,
                    occurredAt
                });
            }

            return Object.freeze({
                key: definition.key,
                reset
            });
        });

    }

}

module.exports = SettingsService;
