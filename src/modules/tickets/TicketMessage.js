class TicketMessage {

    constructor({
        id,
        ticketId,
        authorId,
        content,
        createdAt = new Date()
    } = {}) {

        if (
            typeof id !== "string" ||
            id.trim().length === 0
        ) {
            throw new Error(
                "Ticket message ID is required."
            );
        }

        if (
            typeof ticketId !== "string" ||
            ticketId.trim().length === 0
        ) {
            throw new Error(
                "Ticket ID is required."
            );
        }

        if (
            typeof authorId !== "string" ||
            authorId.trim().length === 0
        ) {
            throw new Error(
                "Ticket message author ID is required."
            );
        }

        if (
            typeof content !== "string" ||
            content.trim().length === 0
        ) {
            throw new Error(
                "Ticket message content is required."
            );
        }

        if (
            !(createdAt instanceof Date) ||
            Number.isNaN(createdAt.getTime())
        ) {
            throw new Error(
                "Ticket message creation date is invalid."
            );
        }

        this.id = id;
        this.ticketId = ticketId;
        this.authorId = authorId;
        this.content = content.trim();
        this.createdAt = createdAt.toISOString();

        Object.freeze(this);

    }

}

module.exports = TicketMessage;
