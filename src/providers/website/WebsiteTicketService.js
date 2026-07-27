class WebsiteTicketService {

    constructor({
        listLimit = 20,
        resolveTicketModule
    } = {}) {

        if (typeof resolveTicketModule !== "function") {
            throw new Error(
                "Website Ticket Module resolver must be a function."
            );
        }

        if (
            !Number.isSafeInteger(listLimit) ||
            listLimit < 1
        ) {
            throw new Error(
                "Website Ticket list limit must be a positive safe integer."
            );
        }

        this.listLimit = listLimit;
        this.resolveTicketModule = resolveTicketModule;

    }

    listCreatorTickets(identity) {

        this.validateIdentity(identity);

        const ticketModule = this.resolveTicketModule();

        if (
            !ticketModule ||
            typeof ticketModule.listTicketsForCreator !==
                "function"
        ) {
            throw this.createError(
                "TICKET_MODULE_UNAVAILABLE",
                "Website Ticket Module is unavailable."
            );
        }

        let tickets;

        try {
            tickets = ticketModule.listTicketsForCreator(
                identity.actorId,
                identity.actorId,
                identity.permissions,
                {
                    latest: true,
                    limit: this.listLimit,
                    offset: 0
                }
            );
        } catch {
            throw this.createError(
                "TICKET_OPERATION_FAILED",
                "Website Ticket listing failed."
            );
        }

        if (!Array.isArray(tickets)) {
            throw this.createError(
                "TICKET_OPERATION_FAILED",
                "Website Ticket listing failed."
            );
        }

        return Object.freeze({
            tickets: Object.freeze(
                tickets.map(ticket =>
                    this.createTicketResponse(ticket)
                )
            )
        });

    }

    validateIdentity(identity) {

        if (
            !identity ||
            typeof identity !== "object" ||
            Array.isArray(identity) ||
            typeof identity.actorId !== "string" ||
            identity.actorId.trim().length === 0 ||
            !Array.isArray(identity.permissions)
        ) {
            throw this.createError(
                "INVALID_IDENTITY",
                "Website Ticket identity is invalid."
            );
        }

    }

    createTicketResponse(ticket) {

        if (
            !ticket ||
            typeof ticket !== "object" ||
            Array.isArray(ticket) ||
            typeof ticket.id !== "string" ||
            ticket.id.trim().length === 0 ||
            typeof ticket.status !== "string" ||
            ticket.status.trim().length === 0 ||
            typeof ticket.createdAt !== "string" ||
            Number.isNaN(
                new Date(ticket.createdAt).getTime()
            )
        ) {
            throw this.createError(
                "TICKET_OPERATION_FAILED",
                "Website Ticket listing failed."
            );
        }

        return Object.freeze({
            ticketId: ticket.id,
            status: ticket.status,
            createdAt: ticket.createdAt
        });

    }

    createError(code, message) {

        const error = new Error(message);

        Object.defineProperty(
            error,
            "code",
            {
                configurable: false,
                enumerable: true,
                value: code,
                writable: false
            }
        );

        return error;

    }

}

module.exports = WebsiteTicketService;