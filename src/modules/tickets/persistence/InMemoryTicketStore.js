class InMemoryTicketStore {

    constructor() {
        this.tickets = new Map();
        this.messages = [];
        this.nextTicketSequence = 1;
        this.nextMessageSequence = 1;
    }

    createTicket(ticket) {

        const sequence = this.nextTicketSequence;

        this.validateSequence(sequence, "Ticket");

        const storedTicket = this.copyTicket({
            id: `ticket-${sequence}`,
            ...ticket
        });

        if (this.tickets.has(storedTicket.id)) {
            throw new Error(
                `Ticket ID already exists: ${storedTicket.id}`
            );
        }

        const previousSequence = this.nextTicketSequence;

        try {
            this.tickets.set(storedTicket.id, storedTicket);
            this.nextTicketSequence += 1;
        } catch (error) {
            Map.prototype.delete.call(
                this.tickets,
                storedTicket.id
            );
            this.nextTicketSequence = previousSequence;
            throw error;
        }

        return this.copyTicket(storedTicket);

    }

    getTicket(ticketId) {

        const ticket = this.tickets.get(ticketId);

        return ticket ? this.copyTicket(ticket) : null;

    }

    replaceTicket(expectedTicket, replacementTicket) {

        this.requireExpectedTicket(expectedTicket);

        const storedReplacement =
            this.copyTicket(replacementTicket);
        const previousTicket = this.tickets.get(
            expectedTicket.id
        );

        try {
            this.tickets.set(
                expectedTicket.id,
                storedReplacement
            );
        } catch (error) {
            Map.prototype.set.call(
                this.tickets,
                expectedTicket.id,
                previousTicket
            );
            throw error;
        }

        return this.copyTicket(storedReplacement);

    }

    appendMessage(expectedTicket, message) {

        this.requireExpectedTicket(expectedTicket);

        const sequence = this.nextMessageSequence;

        this.validateSequence(sequence, "Ticket message");

        const storedMessage = this.copyMessage({
            id: `ticket-message-${sequence}`,
            ticketId: expectedTicket.id,
            ...message
        });

        if (
            this.messages.some(
                currentMessage =>
                    currentMessage.id === storedMessage.id
            )
        ) {
            throw new Error(
                `Ticket message ID already exists: ${storedMessage.id}`
            );
        }

        const previousLength = this.messages.length;
        const previousSequence = this.nextMessageSequence;

        try {
            this.messages.push(storedMessage);
            this.nextMessageSequence += 1;
        } catch (error) {
            this.messages.length = previousLength;
            this.nextMessageSequence = previousSequence;
            throw error;
        }

        return this.copyMessage(storedMessage);

    }

    countTickets() {
        return this.tickets.size;
    }

    countTicketsForCreator(creatorId) {
        return [...this.tickets.values()].filter(
            ticket => ticket.creatorId === creatorId
        ).length;
    }

    listTickets(options = {}) {
        return this.selectTickets(
            [...this.tickets.values()],
            options
        );
    }

    listTicketsForCreator(creatorId, options = {}) {
        return this.selectTickets(
            [...this.tickets.values()].filter(
                ticket => ticket.creatorId === creatorId
            ),
            options
        );
    }

    listTicketsByStatus(status, options = {}) {
        return this.selectTickets(
            [...this.tickets.values()].filter(
                ticket => ticket.status === status
            ),
            options
        );
    }

    listTicketsForAssignee(assigneeId, options = {}) {
        return this.selectTickets(
            [...this.tickets.values()].filter(
                ticket => ticket.assigneeId === assigneeId
            ),
            options
        );
    }

    listUnassignedTickets(options = {}) {
        return this.selectTickets(
            [...this.tickets.values()].filter(
                ticket => ticket.assigneeId === null
            ),
            options
        );
    }

    listMessages(ticketId, {
        limit = null,
        latest = false
    } = {}) {

        let messages = this.messages.filter(
            message => message.ticketId === ticketId
        );

        if (latest && limit !== null) {
            messages = messages.slice(-limit);
        } else if (limit !== null) {
            messages = messages.slice(0, limit);
        }

        return messages.map(
            message => this.copyMessage(message)
        );

    }

    listAllMessages() {
        return this.messages.map(
            message => this.copyMessage(message)
        );
    }

    countMessages(ticketId) {
        return this.messages.filter(
            message => message.ticketId === ticketId
        ).length;
    }

    getSequenceState() {
        return {
            nextTicketSequence: this.nextTicketSequence,
            nextMessageSequence: this.nextMessageSequence
        };
    }

    requireExpectedTicket(expectedTicket) {

        const currentTicket = this.tickets.get(
            expectedTicket.id
        );

        if (
            !currentTicket ||
            currentTicket.creatorId !==
                expectedTicket.creatorId ||
            currentTicket.assigneeId !==
                expectedTicket.assigneeId ||
            currentTicket.status !== expectedTicket.status ||
            currentTicket.createdAt !==
                expectedTicket.createdAt
        ) {
            throw new Error(
                "Ticket state changed; retry the operation."
            );
        }

    }

    selectTickets(tickets, {
        limit = null,
        offset = 0
    } = {}) {

        const selectedTickets = limit === null
            ? tickets.slice(offset)
            : tickets.slice(offset, offset + limit);

        return selectedTickets.map(
            ticket => this.copyTicket(ticket)
        );

    }

    validateSequence(sequence, name) {

        if (
            !Number.isSafeInteger(sequence) ||
            sequence <= 0 ||
            sequence >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                `${name} ID sequence has reached its safe limit.`
            );
        }

    }

    copyTicket(ticket) {
        return {
            id: ticket.id,
            creatorId: ticket.creatorId,
            assigneeId: ticket.assigneeId,
            status: ticket.status,
            createdAt: ticket.createdAt
        };
    }

    copyMessage(message) {
        return {
            id: message.id,
            ticketId: message.ticketId,
            authorId: message.authorId,
            content: message.content,
            createdAt: message.createdAt
        };
    }

}

module.exports = InMemoryTicketStore;
