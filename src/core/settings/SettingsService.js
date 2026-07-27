const SettingsPermission = require(
    "../../shared/permissions/SettingsPermission"
);

class SettingsService {

    constructor({ registry, ownerReaders } = {}) {

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

        this.registry = registry;
        this.ownerReaders = Object.freeze({ ...ownerReaders });

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

    assertReadable(definition) {

        if (definition.secret) {
            throw new Error(
                `Secret setting values cannot be read: ${definition.key}`
            );
        }

    }

    createSnapshot(definition, value) {

        this.assertReadable(definition);

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

    getSetting(actor, settingKey) {

        const permissions = this.validateActor(actor);
        const definition = this.registry.get(settingKey);

        if (!this.canRead(definition, permissions)) {
            throw new Error(`Setting read is not authorized: ${settingKey}`);
        }

        this.assertReadable(definition);

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

}

module.exports = SettingsService;
