const BaseModule = require("../core/BaseModule");
const ComponentState = require(
    "../../core/ComponentState"
);
const TicketMessage = require("./TicketMessage");
const TicketRecord = require("./TicketRecord");
const TicketStatus = require("./TicketStatus");
const TicketPermission = require(
    "../../shared/permissions/TicketPermission"
);
const InMemoryTicketStore = require(
    "./persistence/InMemoryTicketStore"
);

class TicketModule extends BaseModule {

    constructor({
        store = new InMemoryTicketStore()
    } = {}) {

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
        this.validateStore(store);
        this.store = store;

    }

    validateStore(store) {

        const requiredMethods = [
            "createTicket",
            "getTicket",
            "replaceTicket",
            "appendMessage",
            "countTickets",
            "countTicketsForCreator",
            "listTickets",
            "listTicketsForCreator",
            "listTicketsByStatus",
            "listTicketsForAssignee",
            "listUnassignedTickets",
            "listMessages",
            "listAllMessages",
            "countMessages",
            "getSequenceState"
        ];

        if (
            !store ||
            requiredMethods.some(
                method =>
                    typeof store[method] !== "function"
            )
        ) {
            throw new Error(
                "Ticket store does not implement the " +
                "required persistence contract."
            );
        }

    }

    initialize() {

        this.state = ComponentState.INITIALIZING;

        try {
            this.validateDurableState();
        } catch (error) {
            this.state = ComponentState.ERROR;

            throw new Error(
                "Ticket durable state is invalid."
            );
        }

        this.state = ComponentState.READY;

    }

    validateDurableState() {

        const storedTickets = this.store.listTickets();
        const ticketById = new Map();

        storedTickets.forEach(
            (storedTicket, index) => {

                const ticket = this.createTicketSnapshot(
                    storedTicket
                );
                const expectedId = `ticket-${index + 1}`;

                if (
                    ticket.id !== expectedId ||
                    ticketById.has(ticket.id)
                ) {
                    throw new Error(
                        "Stored Ticket sequence is invalid."
                    );
                }

                ticketById.set(ticket.id, ticket);

            }
        );

        const storedMessages =
            this.store.listAllMessages();
        const messageIds = new Set();

        storedMessages.forEach(
            (storedMessage, index) => {

                const message = this.createMessageSnapshot(
                    storedMessage
                );
                const expectedId =
                    `ticket-message-${index + 1}`;
                const ticket = ticketById.get(
                    message.ticketId
                );

                if (
                    message.id !== expectedId ||
                    messageIds.has(message.id)
                ) {
                    throw new Error(
                        "Stored Ticket message sequence is invalid."
                    );
                }

                if (!ticket) {
                    throw new Error(
                        "Stored Ticket message parent is missing."
                    );
                }

                if (
                    new Date(message.createdAt).getTime() <
                    new Date(ticket.createdAt).getTime()
                ) {
                    throw new Error(
                        "Stored Ticket message predates its Ticket."
                    );
                }

                messageIds.add(message.id);

            }
        );

        const sequenceState =
            this.store.getSequenceState();

        if (
            sequenceState.nextTicketSequence !==
                storedTickets.length + 1 ||
            sequenceState.nextMessageSequence !==
                storedMessages.length + 1
        ) {
            throw new Error(
                "Stored Ticket sequence state is invalid."
            );
        }

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

    createStoredTicket(ticket) {
        return {
            id: ticket.id,
            creatorId: ticket.creatorId,
            assigneeId: ticket.assigneeId,
            status: ticket.status,
            createdAt: ticket.createdAt
        };
    }

    validateReadOptions({
        limit = null,
        offset = 0,
        latest = false
    } = {}) {

        if (
            limit !== null &&
            (
                typeof limit !== "number" ||
                !Number.isSafeInteger(limit) ||
                limit <= 0
            )
        ) {
            throw new Error(
                "Ticket read limit must be a positive " +
                "safe integer or null."
            );
        }

        if (
            typeof offset !== "number" ||
            !Number.isSafeInteger(offset) ||
            offset < 0
        ) {
            throw new Error(
                "Ticket read offset must be a " +
                "non-negative safe integer."
            );
        }

        if (typeof latest !== "boolean") {
            throw new Error(
                "Ticket latest-read option must be a boolean."
            );
        }

        return {
            limit,
            offset,
            latest
        };

    }

    hasMessageId(messageId) {

        return this.store.listAllMessages().some(
            message => message.id === messageId
        );

    }

    commitTicketReplacement(
        ticketId,
        currentTicket,
        replacementTicket
    ) {

        if (
            currentTicket.id !== ticketId ||
            replacementTicket.id !== ticketId
        ) {
            throw new Error(
                "Ticket replacement identity is invalid."
            );
        }

        return this.store.replaceTicket(
            this.createStoredTicket(currentTicket),
            this.createStoredTicket(replacementTicket)
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

    hasTicket(
        ticketId,
        actorId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        const storedTicket = this.store.getTicket(ticketId);

        if (!storedTicket) {
            return false;
        }

        const ticket =
            this.createTicketSnapshot(storedTicket);

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

        const ticket = new TicketRecord({
            id: "ticket-pending",
            creatorId,
            status: TicketStatus.OPEN,
            createdAt
        });
        const storedTicket = this.store.createTicket({
            creatorId: ticket.creatorId,
            assigneeId: ticket.assigneeId,
            status: ticket.status,
            createdAt: ticket.createdAt
        });

        return this.createTicketSnapshot(storedTicket);

    }

    getTicket(
        ticketId,
        actorId,
        actorPermissions = []
    ) {

        this.validateTicketId(ticketId);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        const storedTicket = this.store.getTicket(ticketId);

        if (!storedTicket) {
            return null;
        }

        const ticket =
            this.createTicketSnapshot(storedTicket);

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

        return this.store.countTickets();
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

        const storedCurrentTicket =
            this.store.getTicket(ticketId);

        if (!storedCurrentTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        const currentTicket = this.createTicketSnapshot(
            storedCurrentTicket
        );

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
        const storedTicket = this.commitTicketReplacement(
            ticketId,
            currentTicket,
            transitionedTicket
        );

        return this.createTicketSnapshot(storedTicket);

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

        const storedCurrentTicket =
            this.store.getTicket(ticketId);

        if (!storedCurrentTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        const currentTicket = this.createTicketSnapshot(
            storedCurrentTicket
        );

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
        const storedTicket = this.commitTicketReplacement(
            ticketId,
            currentTicket,
            assignedTicket
        );

        return this.createTicketSnapshot(storedTicket);

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

        const storedCurrentTicket =
            this.store.getTicket(ticketId);

        if (!storedCurrentTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        const currentTicket = this.createTicketSnapshot(
            storedCurrentTicket
        );

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
        const storedTicket = this.commitTicketReplacement(
            ticketId,
            currentTicket,
            unassignedTicket
        );

        return this.createTicketSnapshot(storedTicket);

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

        const storedTicket = this.store.getTicket(ticketId);

        if (!storedTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        const ticket =
            this.createTicketSnapshot(storedTicket);

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

        const message = new TicketMessage({
            id: "ticket-message-pending",
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

        const storedMessage = this.store.appendMessage(
            this.createStoredTicket(ticket),
            {
                authorId: message.authorId,
                content: message.content,
                createdAt: message.createdAt
            }
        );

        return this.createMessageSnapshot(storedMessage);

    }

    listMessages(
        ticketId,
        actorId,
        actorPermissions = [],
        options = {}
    ) {

        this.validateTicketId(ticketId);
        this.validateActorId(actorId);
        this.validateActorPermissions(actorPermissions);

        const storedTicket = this.store.getTicket(ticketId);

        if (!storedTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        const ticket =
            this.createTicketSnapshot(storedTicket);

        this.requireCreatorOrPermission(
            ticket,
            actorId,
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket history is limited to its creator " +
                "or actors with view-all permission."
        );

        const readOptions =
            this.validateReadOptions(options);

        return this.store.listMessages(
            ticketId,
            {
                limit: readOptions.limit,
                latest: readOptions.latest
            }
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

        const storedTicket = this.store.getTicket(ticketId);

        if (!storedTicket) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        const ticket =
            this.createTicketSnapshot(storedTicket);

        this.requireCreatorOrPermission(
            ticket,
            actorId,
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket history is limited to its creator " +
                "or actors with view-all permission."
        );

        return this.store.countMessages(ticketId);

    }

    listTickets(
        actorPermissions = [],
        options = {}
    ) {

        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        const readOptions =
            this.validateReadOptions(options);

        return this.store.listTickets(readOptions).map(
            ticket => this.createTicketSnapshot(ticket)
        );

    }

    listTicketsForCreator(
        creatorId,
        actorId,
        actorPermissions = [],
        options = {}
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

        const readOptions =
            this.validateReadOptions(options);

        return this.store
            .listTicketsForCreator(
                creatorId,
                readOptions
            )
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

    getTicketCountForCreator(
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

        return this.store.countTicketsForCreator(creatorId);

    }

    listTicketsByStatus(
        status,
        actorPermissions = [],
        options = {}
    ) {

        this.requireSupportedStatus(status);
        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        const readOptions =
            this.validateReadOptions(options);

        return this.store
            .listTicketsByStatus(status, readOptions)
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

    listTicketsForAssignee(
        assigneeId,
        actorPermissions = [],
        options = {}
    ) {

        this.validateAssigneeId(assigneeId);
        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        const readOptions =
            this.validateReadOptions(options);

        return this.store
            .listTicketsForAssignee(
                assigneeId,
                readOptions
            )
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

    listUnassignedTickets(
        actorPermissions = [],
        options = {}
    ) {

        this.requirePermission(
            actorPermissions,
            TicketPermission.VIEW_ALL,
            "Ticket view-all permission is required."
        );

        const readOptions =
            this.validateReadOptions(options);

        return this.store
            .listUnassignedTickets(readOptions)
            .map(ticket =>
                this.createTicketSnapshot(ticket)
            );

    }

}

module.exports = TicketModule;
