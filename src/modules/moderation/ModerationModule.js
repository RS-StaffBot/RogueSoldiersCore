const BaseModule = require("../core/BaseModule");
const ModerationAction = require("./ModerationAction");

class ModerationModule extends BaseModule {

    constructor() {
        super("Moderation");

        this.actions = new Set(
            Object.values(ModerationAction)
        );
    }

    supports(action) {
        return this.actions.has(action);
    }

    listActions() {
        return [...this.actions];
    }

}

module.exports = ModerationModule;