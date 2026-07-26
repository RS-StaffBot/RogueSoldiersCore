const BaseModule = require("../core/BaseModule");
const TicketStatus = require("./TicketStatus");

class TicketModule extends BaseModule {

    constructor() {

        super("Tickets");

        this.statuses = new Set(
            Object.values(TicketStatus)
        );

    }

    supportsStatus(status) {
        return this.statuses.has(status);
    }

    listStatuses() {
        return [...this.statuses];
    }

}

module.exports = TicketModule;
