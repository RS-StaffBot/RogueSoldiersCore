const TicketStatus = require("./TicketStatus");

class TicketRecord {

    constructor({
        id,
        creatorId,
        assigneeId = null,
        status = TicketStatus.OPEN,
        createdAt = new Date()
    } = {}) {

        if (
            typeof id !== "string" ||
            id.trim().length === 0
        ) {
            throw new Error(
                "Ticket ID is required."
            );
        }

        if (
            typeof creatorId !== "string" ||
            creatorId.trim().length === 0
        ) {
            throw new Error(
                "Ticket creator ID is required."
            );
        }

        if (
            assigneeId !== null &&
            (
                typeof assigneeId !== "string" ||
                assigneeId.trim().length === 0
            )
        ) {
            throw new Error(
                "Ticket assignee ID must be a " +
                "non-empty string or null."
            );
        }

        if (
            !Object.values(TicketStatus)
                .includes(status)
        ) {
            throw new Error(
                "Unsupported ticket status: " +
                String(status)
            );
        }

        if (
            !(createdAt instanceof Date) ||
            Number.isNaN(createdAt.getTime())
        ) {
            throw new Error(
                "Ticket creation date is invalid."
            );
        }

        this.id = id;
        this.creatorId = creatorId;
        this.assigneeId = assigneeId;
        this.status = status;
        this.createdAt = createdAt.toISOString();

        Object.freeze(this);

    }

}

module.exports = TicketRecord;
