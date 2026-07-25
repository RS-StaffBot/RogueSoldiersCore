const BaseModule = require("../core/BaseModule");
const ModerationAction = require("./ModerationAction");
const ModerationAuditRecord = require(
    "./ModerationAuditRecord"
);
const ModerationPermission = require(
    "../../shared/permissions/ModerationPermission"
);

class ModerationModule extends BaseModule {

    constructor() {

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
                ModerationAction.PURGE,
                ModerationPermission.PURGE_MESSAGES
            ]
        ]);

        this.auditRecords = [];

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

        this.auditRecords.push(record);

        return record;

    }

    listAuditRecords() {
        return [...this.auditRecords];
    }

    getAuditRecordCount() {
        return this.auditRecords.length;
    }

}

module.exports = ModerationModule;