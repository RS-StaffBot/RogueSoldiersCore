const BaseModule = require("../core/BaseModule");
const TicketMessage = require("./TicketMessage");
const TicketRecord = require("./TicketRecord");
const TicketStatus = require("./TicketStatus");

class TicketModule extends BaseModule {

    constructor() {

        super("Tickets");

        this.statuses = new Set(
            Object.values(TicketStatus)
        );
        this.statusTransitions = new Map([
            [
                TicketStatus.OPEN,
                new Set([TicketStatus.CLOSED])
            ],
            [
                TicketStatus.CLOSED,
                new Set()
            ]
        ]);
        this.tickets = new Map();
        this.nextTicketId = 1;
        this.messagesByTicket = new Map();
        this.nextMessageId = 1;

    }

    validateTicketId(ticketId) {

        if (
            typeof ticketId !== "string" ||
            ticketId.trim().length === 0
        ) {
            throw new Error(
                "Ticket ID is required."
            );
        }

    }

    validateCreatorId(creatorId) {

        if (
            typeof creatorId !== "string" ||
            creatorId.trim().length === 0
        ) {
            throw new Error(
                "Ticket creator ID is required."
            );
        }

    }

    requireSupportedStatus(status) {

        if (!this.supportsStatus(status)) {
            throw new Error(
                "Unsupported ticket status: " +
                String(status)
            );
        }

    }

    createTicketSnapshot(ticket) {

        return new TicketRecord({
            id: ticket.id,
            creatorId: ticket.creatorId,
            status: ticket.status,
            createdAt: new Date(ticket.createdAt)
        });

    }

    createMessageSnapshot(message) {

        return new TicketMessage({
            id: message.id,
            ticketId: message.ticketId,
            authorId: message.authorId,
            content: message.content,
            createdAt: new Date(message.createdAt)
        });

    }

    hasMessageId(messageId) {

        return [...this.messagesByTicket.values()]
            .some(messages =>
                messages.some(message =>
                    message.id === messageId
                )
            );

    }

    supportsStatus(status) {
        return this.statuses.has(status);
    }

    listStatuses() {
        return [...this.statuses];
    }

    canTransition(fromStatus, toStatus) {

        if (
            !this.supportsStatus(fromStatus) ||
            !this.supportsStatus(toStatus)
        ) {
            return false;
        }

        return this.statusTransitions
            .get(fromStatus)
            .has(toStatus);

    }

    listAllowedTransitions(status) {

        this.requireSupportedStatus(status);

        return [
            ...this.statusTransitions.get(status)
        ];

    }

    hasTicket(ticketId) {

        this.validateTicketId(ticketId);

        return this.tickets.has(ticketId);

    }

    createTicket(
        creatorId,
        createdAt = new Date()
    ) {

        if (
            !Number.isSafeInteger(this.nextTicketId) ||
            this.nextTicketId <= 0 ||
            this.nextTicketId >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                "Ticket ID sequence has reached its safe limit."
            );
        }

        const ticketId = `ticket-${this.nextTicketId}`;

        if (this.tickets.has(ticketId)) {
            throw new Error(
                `Ticket ID already exists: ${ticketId}`
            );
        }

        const ticket = new TicketRecord({
            id: ticketId,
            creatorId,
            status: TicketStatus.OPEN,
            createdAt
        });
        const snapshot =
            this.createTicketSnapshot(ticket);
        const previousNextTicketId =
            this.nextTicketId;

        try {

            this.tickets.set(ticketId, ticket);
            this.nextTicketId += 1;

        } catch (error) {

            this.tickets.delete(ticketId);
            this.nextTicketId =
                previousNextTicketId;

            throw error;

        }

        return snapshot;

    }

    getTicket(ticketId) {

        this.validateTicketId(ticketId);

        const ticket = this.tickets.get(ticketId);

        if (!ticket) {
            return null;
        }

        return this.createTicketSnapshot(ticket);

    }

    getTicketCount() {
        return this.tickets.size;
    }

    transitionTicket(ticketId, status) {

        this.validateTicketId(ticketId);
        this.requireSupportedStatus(status);

        const currentTicket =
            this.tickets.get(ticketId);

        if (!currentTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        if (
            !this.canTransition(
                currentTicket.status,
                status
            )
        ) {
            throw new Error(
                "Ticket transition from " +
                `${currentTicket.status} to ${status} ` +
                "is not allowed."
            );
        }

        const transitionedTicket =
            new TicketRecord({
                id: currentTicket.id,
                creatorId: currentTicket.creatorId,
                status,
                createdAt: new Date(
                    currentTicket.createdAt
                )
            });
        const snapshot = this.createTicketSnapshot(
            transitionedTicket
        );

        try {

            this.tickets.set(
                ticketId,
                transitionedTicket
            );

        } catch (error) {

            if (
                this.tickets.get(ticketId) !==
                currentTicket
            ) {
                Map.prototype.set.call(
                    this.tickets,
                    ticketId,
                    currentTicket
                );
            }

            throw error;

        }

        return snapshot;

    }

    closeTicket(ticketId) {

        return this.transitionTicket(
            ticketId,
            TicketStatus.CLOSED
        );

    }

    addMessage(
        ticketId,
        authorId,
        content,
        createdAt = new Date()
    ) {

        this.validateTicketId(ticketId);

        const ticket = this.tickets.get(ticketId);

        if (!ticket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        if (ticket.status !== TicketStatus.OPEN) {
            throw new Error(
                "Ticket messages require an open ticket."
            );
        }

        if (
            !Number.isSafeInteger(this.nextMessageId) ||
            this.nextMessageId <= 0 ||
            this.nextMessageId >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                "Ticket message ID sequence has " +
                "reached its safe limit."
            );
        }

        const messageId =
            `ticket-message-${this.nextMessageId}`;

        if (this.hasMessageId(messageId)) {
            throw new Error(
                `Ticket message ID already exists: ${messageId}`
            );
        }

        const message = new TicketMessage({
            id: messageId,
            ticketId,
            authorId,
            content,
            createdAt
        });

        if (
            new Date(message.createdAt).getTime() <
            new Date(ticket.createdAt).getTime()
        ) {
            throw new Error(
                "Ticket message date cannot be before " +
                "the ticket creation date."
            );
        }

        const snapshot =
            this.createMessageSnapshot(message);
        const previousMessages =
            this.messagesByTicket.get(ticketId);
        const updatedMessages = [
            ...(previousMessages || []),
            message
        ];
        const previousNextMessageId =
            this.nextMessageId;

        try {

            this.messagesByTicket.set(
                ticketId,
                updatedMessages
            );
            this.nextMessageId += 1;

        } catch (error) {

            if (previousMessages) {
                Map.prototype.set.call(
                    this.messagesByTicket,
                    ticketId,
                    previousMessages
                );
            } else {
                Map.prototype.delete.call(
                    this.messagesByTicket,
                    ticketId
                );
            }

            this.nextMessageId =
                previousNextMessageId;

            throw error;

        }

        return snapshot;

    }

    listMessages(ticketId) {

        this.validateTicketId(ticketId);

        if (!this.tickets.has(ticketId)) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        return (
            this.messagesByTicket.get(ticketId) || []
        ).map(message =>
            this.createMessageSnapshot(message)
        );

    }

    getMessageCount(ticketId) {

        this.validateTicketId(ticketId);

        if (!this.tickets.has(ticketId)) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        return (
            this.messagesByTicket.get(ticketId) || []
        ).length;

    }

    listTickets() {

        return [...this.tickets.values()].map(
            ticket => this.createTicketSnapshot(ticket)
        );

    }

    listTicketsForCreator(creatorId) {

        this.validateCreatorId(creatorId);

        return [...this.tickets.values()]
            .filter(ticket =>
                ticket.creatorId === creatorId
            )
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

    listTicketsByStatus(status) {

        this.requireSupportedStatus(status);

        return [...this.tickets.values()]
            .filter(ticket =>
                ticket.status === status
            )
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

}

module.exports = TicketModule;
