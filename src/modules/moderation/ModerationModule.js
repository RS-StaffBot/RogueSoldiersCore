const Logger = require("../../core/Logger");
const ComponentState = require(
    "../../core/ComponentState"
);
const BaseModule = require("../core/BaseModule");
const ModerationAction = require("./ModerationAction");
const ModerationAuditRecord = require(
    "./ModerationAuditRecord"
);
const ModerationPermission = require(
    "../../shared/permissions/ModerationPermission"
);
const InMemoryModerationStore = require(
    "./persistence/InMemoryModerationStore"
);

class ModerationModule extends BaseModule {

    constructor({
        store = new InMemoryModerationStore()
    } = {}) {

        super("Moderation");

        this.actionPermissions = new Map([
            [
                ModerationAction.BAN,
                ModerationPermission.BAN_MEMBERS
            ],
            [
                ModerationAction.KICK,
                ModerationPermission.KICK_MEMBERS
            ],
            [
                ModerationAction.WARN,
                ModerationPermission.WARN_MEMBERS
            ],
            [
                ModerationAction.TIMEOUT,
                ModerationPermission.TIMEOUT_MEMBERS
            ],
            [
                ModerationAction.UNTIMEOUT,
                ModerationPermission.TIMEOUT_MEMBERS
            ],
            [
                ModerationAction.PURGE,
                ModerationPermission.PURGE_MESSAGES
            ]
        ]);

        this.validateStore(store);
        this.store = store;

    }

    validateStore(store) {

        if (
            !store ||
            typeof store.append !== "function" ||
            typeof store.list !== "function" ||
            typeof store.count !== "function"
        ) {
            throw new Error(
                "Moderation store must implement append(), " +
                "list(), and count()."
            );
        }

    }

    initialize() {

        this.state = ComponentState.INITIALIZING;

        try {
            this.listAuditRecords();
        } catch (error) {
            this.state = ComponentState.ERROR;

            throw new Error(
                "Moderation durable state is invalid."
            );
        }

        this.state = ComponentState.READY;

    }

    supports(action) {
        return this.actionPermissions.has(action);
    }

    listActions() {
        return [...this.actionPermissions.keys()];
    }

    getRequiredPermission(action) {

        if (!this.supports(action)) {
            throw new Error(
                `Unsupported moderation action: ${action}`
            );
        }

        return this.actionPermissions.get(action);

    }

    recordAction(recordData) {

        if (!recordData || typeof recordData !== "object") {
            throw new Error(
                "Moderation audit record data is required."
            );
        }

        if (!this.supports(recordData.action)) {
            throw new Error(
                `Unsupported moderation action: ${recordData.action}`
            );
        }

        const record = new ModerationAuditRecord(
            recordData
        );

        this.store.append(record);

        Logger.moderationAudit(
            [
                `Action=${record.action}`,
                `Guild=${record.guildId}`,
                `Moderator=${record.moderatorId}`,
                `Target=${record.targetId || "none"}`,
                `Reason=${record.reason}`
            ].join("\n")
        );

        return record;

    }

    listAuditRecords() {

        return this.store.list().map(record => {

            if (!this.supports(record.action)) {
                throw new Error(
                    "Stored moderation action is unsupported."
                );
            }

            return new ModerationAuditRecord({
                action: record.action,
                guildId: record.guildId,
                moderatorId: record.moderatorId,
                targetId: record.targetId,
                reason: record.reason,
                details: record.details,
                createdAt: new Date(record.createdAt)
            });

        });

    }

    getAuditRecordCount() {
        return this.store.count();
    }

}

module.exports = ModerationModule;
