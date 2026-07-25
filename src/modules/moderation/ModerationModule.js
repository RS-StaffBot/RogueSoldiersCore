const BaseModule = require("../core/BaseModule");
const ModerationAction = require("./ModerationAction");
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

}

module.exports = ModerationModule;