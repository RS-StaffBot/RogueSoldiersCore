const SettingsService = require("./SettingsService");

class LiveSettingsService extends SettingsService {

    constructor({ ownerApplicators, auditStore, ...options } = {}) {

        if (
            !ownerApplicators ||
            typeof ownerApplicators !== "object" ||
            Array.isArray(ownerApplicators)
        ) {
            throw new Error("Live settings owner applicators are invalid.");
        }

        if (
            !auditStore ||
            typeof auditStore.runTransaction !== "function" ||
            typeof auditStore.record !== "function"
        ) {
            throw new Error("Live settings require an audit store.");
        }

        super({ ...options, auditStore: null });
        this.ownerApplicators = Object.freeze({ ...ownerApplicators });
        this.liveAuditStore = auditStore;

    }

    getApplicator(definition) {

        const applicator = this.ownerApplicators[definition.owner];

        if (
            !applicator ||
            typeof applicator.get !== "function" ||
            typeof applicator.getDefault !== "function" ||
            typeof applicator.apply !== "function" ||
            typeof applicator.restore !== "function"
        ) {
            throw new Error(
                `Unsupported live setting owner: ${definition.owner}`
            );
        }

        return applicator;

    }

    runLiveMutation(operation, compensate) {

        try {
            return this.liveAuditStore.runTransaction(operation);
        } catch (error) {
            compensate();
            throw error;
        }

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

        const applicator = this.getApplicator(definition);
        const previousRuntimeValue = applicator.get(definition.key);
        const occurredAt = this.getTimestamp();
        let runtimeApplicationAttempted = false;

        return this.runLiveMutation(() => {
            const previousRecord = this.store.get(definition.key);
            const newRecord = this.store.save({
                settingKey: definition.key,
                valueType: definition.valueType,
                value,
                updatedAt: occurredAt,
                updatedBy: actor.actorId
            });

            this.liveAuditStore.record({
                settingKey: definition.key,
                action: "UPDATE",
                previousRecord,
                newRecord,
                actorId: actor.actorId,
                occurredAt
            });

            runtimeApplicationAttempted = true;
            applicator.apply(definition.key, value);

            return Object.freeze({
                ...newRecord,
                activeValue: applicator.get(definition.key)
            });
        }, () => {
            if (runtimeApplicationAttempted) {
                applicator.restore(definition.key, previousRuntimeValue);
            }
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

        const previousRecord = this.store.get(definition.key);

        if (!previousRecord) {
            return Object.freeze({
                key: definition.key,
                reset: false,
                activeValue: this.readValue(definition)
            });
        }

        const applicator = this.getApplicator(definition);
        const previousRuntimeValue = applicator.get(definition.key);
        const defaultValue = applicator.getDefault(definition.key);

        this.validateValueType(definition, defaultValue);
        this.validateOwnerValue(definition, defaultValue);

        const occurredAt = this.getTimestamp();
        let runtimeApplicationAttempted = false;

        return this.runLiveMutation(() => {
            const reset = this.store.delete(definition.key);

            if (!reset) {
                throw new Error(
                    `Stored setting disappeared during reset: ${settingKey}`
                );
            }

            this.liveAuditStore.record({
                settingKey: definition.key,
                action: "RESET",
                previousRecord,
                newRecord: null,
                actorId: actor.actorId,
                occurredAt
            });

            runtimeApplicationAttempted = true;
            applicator.apply(definition.key, defaultValue);

            return Object.freeze({
                key: definition.key,
                reset: true,
                activeValue: applicator.get(definition.key)
            });
        }, () => {
            if (runtimeApplicationAttempted) {
                applicator.restore(definition.key, previousRuntimeValue);
            }
        });

    }

}

module.exports = LiveSettingsService;
