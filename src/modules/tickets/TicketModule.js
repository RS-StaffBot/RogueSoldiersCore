const BaseModule = require("../core/BaseModule");
const TicketMessage = require("./TicketMessage");
const TicketRecord = require("./TicketRecord");
const TicketStatus = require("./TicketStatus");
const TicketPermission = require(
    "../../shared/permissions/TicketPermission"
);

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

    validateAssigneeId(assigneeId) {

        if (
            typeof assigneeId !== "string" ||
            assigneeId.trim().length === 0
        ) {
            throw new Error(
                "Ticket assignee ID is required."
            );
        }

    }

    validateActorId(actorId) {

        if (
            typeof actorId !== "string" ||
            actorId.trim().length === 0
        ) {
            throw new Error(
                "Ticket actor ID is required."
            );
        }

    }

    validateActorPermissions(actorPermissions) {

        if (!Array.isArray(actorPermissions)) {
            throw new Error(
                "Ticket actor permissions must be an array."
            );
        }

    }

    hasPermission(
        actorPermissions,
        permission
    ) {

        this.validateActorPermissions(actorPermissions);

        return (
            actorPermissions.includes(permission) ||
            actorPermissions.includes(
                TicketPermission.ADMINISTRATE
            )
        );

    }

    requirePermission(
        actorPermissions,
        permission,
        message
    ) {

        if (
            !this.hasPermission(
                actorPermissions,
                permission
            )
        ) {
            throw new Error(message);
        }

    }

    canAccessCreatorOwnedTicket(
        ticket,
        actorId,
        actorPermissions,
        staffPermission
    ) {

        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        return (
            ticket.creatorId === actorId ||
            this.hasPermission(
                actorPermissions,
                staffPermission
            )
        );

    }

    requireCreatorOrPermission(
        ticket,
        actorId,
        actorPermissions,
        staffPermission,
        message
    ) {

        if (
            !this.canAccessCreatorOwnedTicket(
                ticket,
                actorId,
                actorPermissions,
                staffPermission
            )
        ) {
            throw new Error(message);
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
            assigneeId: ticket.assigneeId,
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

    commitTicketReplacement(
        ticketId,
        currentTicket,
        replacementTicket
    ) {

        try {

            this.tickets.set(
                ticketId,
                replacementTicket
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

    hasTicket(
        ticketId,
        actorId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        const ticket = this.tickets.get(ticketId);

        if (!ticket) {
            return false;
        }

        this.requireCreatorOrPermission(
            ticket,
            actorId,
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket access is limited to its creator " +
                "or actors with view-all permission."
        );

        return true;

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

    getTicket(
        ticketId,
        actorId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        const ticket = this.tickets.get(ticketId);

        if (!ticket) {
            return null;
        }

        this.requireCreatorOrPermission(
            ticket,
            actorId,
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket access is limited to its creator " +
                "or actors with view-all permission."
        );

        return this.createTicketSnapshot(ticket);

    }

    getTicketCount(actorPermissions = []) {

        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        return this.tickets.size;
    }

    transitionTicket(
        ticketId,
        status,
        actorId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.requireSupportedStatus(status);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        const currentTicket =
            this.tickets.get(ticketId);

        if (!currentTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        this.requireCreatorOrPermission(
            currentTicket,
            actorId,
            actorPermissions,
            TicketPermission.CLOSE,
            "Ticket closing is limited to its creator " +
                "or actors with close permission."
        );

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
                assigneeId: currentTicket.assigneeId,
                status,
                createdAt: new Date(
                    currentTicket.createdAt
                )
            });
        const snapshot = this.createTicketSnapshot(
            transitionedTicket
        );

        this.commitTicketReplacement(
            ticketId,
            currentTicket,
            transitionedTicket
        );

        return snapshot;

    }

    closeTicket(
        ticketId,
        actorId,
        actorPermissions = []
    ) {

        return this.transitionTicket(
            ticketId,
            TicketStatus.CLOSED,
            actorId,
            actorPermissions
        );

    }

    assignTicket(
        ticketId,
        assigneeId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.validateAssigneeId(assigneeId);
        this.requirePermission(
            actorPermissions,
            TicketPermission.ASSIGN,
            "Ticket assignment permission is required."
        );

        const currentTicket =
            this.tickets.get(ticketId);

        if (!currentTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        if (currentTicket.status !== TicketStatus.OPEN) {
            throw new Error(
                "Ticket assignments require an open ticket."
            );
        }

        if (currentTicket.assigneeId === assigneeId) {
            throw new Error(
                `Ticket is already assigned to: ${assigneeId}`
            );
        }

        const assignedTicket = new TicketRecord({
            id: currentTicket.id,
            creatorId: currentTicket.creatorId,
            assigneeId,
            status: currentTicket.status,
            createdAt: new Date(
                currentTicket.createdAt
            )
        });
        const snapshot =
            this.createTicketSnapshot(assignedTicket);

        this.commitTicketReplacement(
            ticketId,
            currentTicket,
            assignedTicket
        );

        return snapshot;

    }

    unassignTicket(
        ticketId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.requirePermission(
            actorPermissions,
            TicketPermission.ASSIGN,
            "Ticket assignment permission is required."
        );

        const currentTicket =
            this.tickets.get(ticketId);

        if (!currentTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        if (currentTicket.status !== TicketStatus.OPEN) {
            throw new Error(
                "Ticket assignments require an open ticket."
            );
        }

        if (currentTicket.assigneeId === null) {
            throw new Error(
                "Ticket is not assigned."
            );
        }

        const unassignedTicket = new TicketRecord({
            id: currentTicket.id,
            creatorId: currentTicket.creatorId,
            assigneeId: null,
            status: currentTicket.status,
            createdAt: new Date(
                currentTicket.createdAt
            )
        });
        const snapshot = this.createTicketSnapshot(
            unassignedTicket
        );

        this.commitTicketReplacement(
            ticketId,
            currentTicket,
            unassignedTicket
        );

        return snapshot;

    }

    addMessage(
        ticketId,
        authorId,
        content,
        createdAt = new Date(),
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.validateActorId(authorId);
        this.validateActorPermissions(actorPermissions);

        const ticket = this.tickets.get(ticketId);

        if (!ticket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        this.requireCreatorOrPermission(
            ticket,
            authorId,
            actorPermissions,
            TicketPermission.RESPOND,
            "Ticket responses are limited to its creator " +
                "or actors with respond permission."
        );

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

    listMessages(
        ticketId,
        actorId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        const ticket = this.tickets.get(ticketId);

        if (!ticket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        this.requireCreatorOrPermission(
            ticket,
            actorId,
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket history is limited to its creator " +
                "or actors with view-all permission."
        );

        return (
            this.messagesByTicket.get(ticketId) || []
        ).map(message =>
            this.createMessageSnapshot(message)
        );

    }

    getMessageCount(
        ticketId,
        actorId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        const ticket = this.tickets.get(ticketId);

        if (!ticket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        this.requireCreatorOrPermission(
            ticket,
            actorId,
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket history is limited to its creator " +
                "or actors with view-all permission."
        );

        return (
            this.messagesByTicket.get(ticketId) || []
        ).length;

    }

    listTickets(actorPermissions = []) {

        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        return [...this.tickets.values()].map(
            ticket => this.createTicketSnapshot(ticket)
        );

    }

    listTicketsForCreator(
        creatorId,
        actorId,
        actorPermissions = []
    ) {

        this.validateCreatorId(creatorId);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        if (
            creatorId !== actorId &&
            !this.hasPermission(
                actorPermissions,
                TicketPermission.VIEW_ALL
            )
        ) {
            throw new Error(
                "Ticket creator filtering is limited to " +
                "that creator or actors with view-all " +
                "permission."
            );
        }

        return [...this.tickets.values()]
            .filter(ticket =>
                ticket.creatorId === creatorId
            )
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

    listTicketsByStatus(
        status,
        actorPermissions = []
    ) {

        this.requireSupportedStatus(status);
        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        return [...this.tickets.values()]
            .filter(ticket =>
                ticket.status === status
            )
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

    listTicketsForAssignee(
        assigneeId,
        actorPermissions = []
    ) {

        this.validateAssigneeId(assigneeId);
        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        return [...this.tickets.values()]
            .filter(ticket =>
                ticket.assigneeId === assigneeId
            )
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

    listUnassignedTickets(
        actorPermissions = []
    ) {

        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        return [...this.tickets.values()]
            .filter(ticket =>
                ticket.assigneeId === null
            )
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

}

module.exports = TicketModule;
