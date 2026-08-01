const BaseModule = require("../core/BaseModule");
const ComponentState = require("../../core/ComponentState");
const AuditRecord = require("./AuditRecord");
const InMemoryAuditStore = require(
    "./persistence/InMemoryAuditStore"
);

class AuditModule extends BaseModule {

    constructor({
        store = new InMemoryAuditStore(),
        clock = () => new Date(),
        defaultRecentLimit = 25,
        maximumRecentLimit = 100
    } = {}) {

        super("Audit");

        this.validateStore(store);

        if (typeof clock !== "function") {
            throw new Error("Audit clock must be a function.");
        }

        this.validateLimit(
            defaultRecentLimit,
            "default recent limit"
        );
        this.validateLimit(
            maximumRecentLimit,
            "maximum recent limit"
        );

        if (defaultRecentLimit > maximumRecentLimit) {
            throw new Error(
                "Audit default recent limit cannot exceed the maximum."
            );
        }

        this.store = store;
        this.clock = clock;
        this.defaultRecentLimit = defaultRecentLimit;
        this.maximumRecentLimit = maximumRecentLimit;

    }

    validateStore(store) {

        const requiredMethods = [
            "append",
            "getById",
            "listAll",
            "listRecent",
            "count"
        ];

        if (
            !store ||
            requiredMethods.some(
                method => typeof store[method] !== "function"
            )
        ) {
            throw new Error(
                "Audit store does not implement the required contract."
            );
        }

    }

    validateLimit(limit, fieldName = "recent limit") {

        if (
            !Number.isSafeInteger(limit) ||
            limit <= 0
        ) {
            throw new Error(
                `Audit ${fieldName} must be a positive safe integer.`
            );
        }

    }

    initialize() {

        this.state = ComponentState.INITIALIZING;

        try {
            for (const storedRecord of this.store.listAll()) {
                this.createRecordSnapshot(storedRecord);
            }
        } catch (error) {
            this.state = ComponentState.ERROR;

            throw new Error("Audit durable state is invalid.");
        }

        this.state = ComponentState.READY;

    }

    recordAction(data) {

        const createdAt = this.clock();
        const draft = AuditRecord.createDraft({
            ...data,
            createdAt
        });
        const storedRecord = this.store.append(draft);

        return this.createRecordSnapshot(storedRecord);

    }

    getRecord(id) {

        if (
            typeof id !== "string" ||
            !/^audit-[1-9]\d*$/.test(id)
        ) {
            throw new Error("Audit record ID is invalid.");
        }

        const storedRecord = this.store.getById(id);

        return storedRecord
            ? this.createRecordSnapshot(storedRecord)
            : null;

    }

    listRecent(limit = this.defaultRecentLimit) {

        this.validateLimit(limit);

        if (limit > this.maximumRecentLimit) {
            throw new Error(
                "Audit recent limit exceeds the configured maximum."
            );
        }

        return Object.freeze(
            this.store.listRecent(limit).map(
                storedRecord =>
                    this.createRecordSnapshot(storedRecord)
            )
        );

    }

    countRecords() {
        return this.store.count();
    }

    createRecordSnapshot(storedRecord) {
        return new AuditRecord({
            ...storedRecord,
            createdAt: storedRecord.createdAt instanceof Date
                ? storedRecord.createdAt
                : new Date(storedRecord.createdAt)
        });
    }

}

module.exports = AuditModule;
