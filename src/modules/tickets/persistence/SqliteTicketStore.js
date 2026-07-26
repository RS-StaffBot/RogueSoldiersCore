class SqliteTicketStore {

    #database;
    #insertTicket;
    #selectTicket;
    #replaceTicket;
    #countTickets;
    #countTicketsForCreator;
    #listTickets;
    #listTicketsForCreator;
    #listTicketsByStatus;
    #listTicketsForAssignee;
    #listUnassignedTickets;
    #insertMessage;
    #listMessages;
    #listLatestMessages;
    #listAllMessages;
    #countMessages;
    #selectSequence;

    constructor(database) {

        if (!database) {
            throw new Error(
                "A database connection is required for " +
                "Ticket persistence."
            );
        }

        this.#database = database;
        this.#insertTicket = database.prepare(`
            INSERT INTO tickets (
                creator_id,
                assignee_id,
                status,
                created_at
            ) VALUES (?, ?, ?, ?)
        `);
        this.#selectTicket = database.prepare(`
            SELECT
                sequence,
                creator_id AS creatorId,
                assignee_id AS assigneeId,
                status,
                created_at AS createdAt
            FROM tickets
            WHERE sequence = ?
        `);
        this.#replaceTicket = database.prepare(`
            UPDATE tickets
            SET
                assignee_id = ?,
                status = ?
            WHERE
                sequence = ? AND
                creator_id = ? AND
                (
                    (
                        assignee_id IS NULL AND
                        ? IS NULL
                    ) OR
                    assignee_id = ?
                ) AND
                status = ? AND
                created_at = ?
        `);
        this.#countTickets = database.prepare(`
            SELECT COUNT(*) AS count
            FROM tickets
        `);
        this.#countTicketsForCreator = database.prepare(`
            SELECT COUNT(*) AS count
            FROM tickets
            WHERE creator_id = ?
        `);
        this.#listTickets = database.prepare(`
            SELECT
                sequence,
                creator_id AS creatorId,
                assignee_id AS assigneeId,
                status,
                created_at AS createdAt
            FROM tickets
            ORDER BY sequence ASC
            LIMIT ? OFFSET ?
        `);
        this.#listTicketsForCreator = database.prepare(`
            SELECT
                sequence,
                creator_id AS creatorId,
                assignee_id AS assigneeId,
                status,
                created_at AS createdAt
            FROM tickets
            WHERE creator_id = ?
            ORDER BY sequence ASC
            LIMIT ? OFFSET ?
        `);
        this.#listTicketsByStatus = database.prepare(`
            SELECT
                sequence,
                creator_id AS creatorId,
                assignee_id AS assigneeId,
                status,
                created_at AS createdAt
            FROM tickets
            WHERE status = ?
            ORDER BY sequence ASC
            LIMIT ? OFFSET ?
        `);
        this.#listTicketsForAssignee = database.prepare(`
            SELECT
                sequence,
                creator_id AS creatorId,
                assignee_id AS assigneeId,
                status,
                created_at AS createdAt
            FROM tickets
            WHERE assignee_id = ?
            ORDER BY sequence ASC
            LIMIT ? OFFSET ?
        `);
        this.#listUnassignedTickets = database.prepare(`
            SELECT
                sequence,
                creator_id AS creatorId,
                assignee_id AS assigneeId,
                status,
                created_at AS createdAt
            FROM tickets
            WHERE assignee_id IS NULL
            ORDER BY sequence ASC
            LIMIT ? OFFSET ?
        `);
        this.#insertMessage = database.prepare(`
            INSERT INTO ticket_messages (
                ticket_sequence,
                author_id,
                content,
                created_at
            ) VALUES (?, ?, ?, ?)
        `);
        this.#listMessages = database.prepare(`
            SELECT
                message.sequence,
                message.ticket_sequence AS ticketSequence,
                message.author_id AS authorId,
                message.content,
                message.created_at AS createdAt
            FROM ticket_messages AS message
            WHERE message.ticket_sequence = ?
            ORDER BY message.sequence ASC
            LIMIT ?
        `);
        this.#listLatestMessages = database.prepare(`
            SELECT
                message.sequence,
                message.ticket_sequence AS ticketSequence,
                message.author_id AS authorId,
                message.content,
                message.created_at AS createdAt
            FROM ticket_messages AS message
            WHERE message.ticket_sequence = ?
            ORDER BY message.sequence DESC
            LIMIT ?
        `);
        this.#listAllMessages = database.prepare(`
            SELECT
                message.sequence,
                message.ticket_sequence AS ticketSequence,
                message.author_id AS authorId,
                message.content,
                message.created_at AS createdAt
            FROM ticket_messages AS message
            ORDER BY message.sequence ASC
        `);
        this.#countMessages = database.prepare(`
            SELECT COUNT(*) AS count
            FROM ticket_messages
            WHERE ticket_sequence = ?
        `);
        this.#selectSequence = database.prepare(`
            SELECT seq
            FROM sqlite_sequence
            WHERE name = ?
        `);

    }

    createTicket(ticket) {

        return this.runTransaction(() => {

            const result = this.#insertTicket.run(
                ticket.creatorId,
                ticket.assigneeId,
                ticket.status,
                ticket.createdAt
            );
            const sequence = this.validateSequence(
                result.lastInsertRowid,
                "Ticket"
            );

            return this.mapTicket(
                this.#selectTicket.get(sequence)
            );

        });

    }

    getTicket(ticketId) {

        const sequence = this.parsePublicId(
            ticketId,
            /^ticket-([1-9]\d*)$/
        );

        if (sequence === null) {
            return null;
        }

        const row = this.#selectTicket.get(sequence);

        return row ? this.mapTicket(row) : null;

    }

    replaceTicket(expectedTicket, replacementTicket) {

        const sequence = this.requireTicketSequence(
            expectedTicket.id
        );

        return this.runTransaction(() => {

            const result = this.#replaceTicket.run(
                replacementTicket.assigneeId,
                replacementTicket.status,
                sequence,
                expectedTicket.creatorId,
                expectedTicket.assigneeId,
                expectedTicket.assigneeId,
                expectedTicket.status,
                expectedTicket.createdAt
            );

            if (result.changes !== 1) {
                throw new Error(
                    "Ticket state changed; retry the operation."
                );
            }

            return this.mapTicket(
                this.#selectTicket.get(sequence)
            );

        });

    }

    appendMessage(expectedTicket, message) {

        const ticketSequence = this.requireTicketSequence(
            expectedTicket.id
        );

        return this.runTransaction(() => {

            this.requireExpectedTicket(
                ticketSequence,
                expectedTicket
            );

            const result = this.#insertMessage.run(
                ticketSequence,
                message.authorId,
                message.content,
                message.createdAt
            );
            const messageSequence = this.validateSequence(
                result.lastInsertRowid,
                "Ticket message"
            );

            return {
                id: `ticket-message-${messageSequence}`,
                ticketId: expectedTicket.id,
                authorId: message.authorId,
                content: message.content,
                createdAt: message.createdAt
            };

        });

    }

    countTickets() {
        return this.#countTickets.get().count;
    }

    countTicketsForCreator(creatorId) {
        return this.#countTicketsForCreator.get(
            creatorId
        ).count;
    }

    listTickets(options = {}) {

        const pagination = this.getPagination(options);

        return this.#listTickets.all(
            pagination.limit,
            pagination.offset
        ).map(row => this.mapTicket(row));

    }

    listTicketsForCreator(creatorId, options = {}) {

        const pagination = this.getPagination(options);

        return this.#listTicketsForCreator.all(
            creatorId,
            pagination.limit,
            pagination.offset
        ).map(row => this.mapTicket(row));

    }

    listTicketsByStatus(status, options = {}) {

        const pagination = this.getPagination(options);

        return this.#listTicketsByStatus.all(
            status,
            pagination.limit,
            pagination.offset
        ).map(row => this.mapTicket(row));

    }

    listTicketsForAssignee(assigneeId, options = {}) {

        const pagination = this.getPagination(options);

        return this.#listTicketsForAssignee.all(
            assigneeId,
            pagination.limit,
            pagination.offset
        ).map(row => this.mapTicket(row));

    }

    listUnassignedTickets(options = {}) {

        const pagination = this.getPagination(options);

        return this.#listUnassignedTickets.all(
            pagination.limit,
            pagination.offset
        ).map(row => this.mapTicket(row));

    }

    listMessages(ticketId, {
        limit = null,
        latest = false
    } = {}) {

        const ticketSequence = this.requireTicketSequence(
            ticketId
        );
        const storedLimit = limit === null ? -1 : limit;
        const rows = latest
            ? this.#listLatestMessages.all(
                ticketSequence,
                storedLimit
            ).reverse()
            : this.#listMessages.all(
                ticketSequence,
                storedLimit
            );

        return rows.map(row => this.mapMessage(row));

    }

    listAllMessages() {
        return this.#listAllMessages.all().map(
            row => this.mapMessage(row)
        );
    }

    countMessages(ticketId) {

        const ticketSequence = this.requireTicketSequence(
            ticketId
        );

        return this.#countMessages.get(
            ticketSequence
        ).count;

    }

    getSequenceState() {

        return {
            nextTicketSequence:
                this.getNextSequence("tickets"),
            nextMessageSequence:
                this.getNextSequence("ticket_messages")
        };

    }

    requireExpectedTicket(sequence, expectedTicket) {

        const row = this.#selectTicket.get(sequence);

        if (!row) {
            throw new Error(
                "Ticket state changed; retry the operation."
            );
        }

        const currentTicket = this.mapTicket(row);

        if (
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

    getPagination({
        limit = null,
        offset = 0
    } = {}) {
        return {
            limit: limit === null ? -1 : limit,
            offset
        };
    }

    getNextSequence(tableName) {

        const row = this.#selectSequence.get(tableName);
        const nextSequence = row
            ? Number(row.seq) + 1
            : 1;

        this.validateSequence(
            nextSequence,
            tableName === "tickets"
                ? "Ticket"
                : "Ticket message"
        );

        return nextSequence;

    }

    requireTicketSequence(ticketId) {

        const sequence = this.parsePublicId(
            ticketId,
            /^ticket-([1-9]\d*)$/
        );

        if (sequence === null) {
            throw new Error(
                `Ticket not found: ${ticketId}`
            );
        }

        return sequence;

    }

    parsePublicId(id, pattern) {

        const match = pattern.exec(id);

        if (!match) {
            return null;
        }

        const sequence = Number(match[1]);

        return Number.isSafeInteger(sequence)
            ? sequence
            : null;

    }

    validateSequence(sequenceValue, name) {

        const sequence = Number(sequenceValue);

        if (
            !Number.isSafeInteger(sequence) ||
            sequence <= 0 ||
            sequence >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                `${name} ID sequence has reached its safe limit.`
            );
        }

        return sequence;

    }

    mapTicket(row) {

        const sequence = this.validateSequence(
            row.sequence,
            "Stored Ticket"
        );

        return {
            id: `ticket-${sequence}`,
            creatorId: row.creatorId,
            assigneeId: row.assigneeId,
            status: row.status,
            createdAt: row.createdAt
        };

    }

    mapMessage(row) {

        const messageSequence = this.validateSequence(
            row.sequence,
            "Stored Ticket message"
        );
        const ticketSequence = this.validateSequence(
            row.ticketSequence,
            "Stored Ticket"
        );

        return {
            id: `ticket-message-${messageSequence}`,
            ticketId: `ticket-${ticketSequence}`,
            authorId: row.authorId,
            content: row.content,
            createdAt: row.createdAt
        };

    }

    runTransaction(operation) {

        this.#database.exec("BEGIN IMMEDIATE");

        try {

            const result = operation();

            this.#database.exec("COMMIT");

            return result;

        } catch (error) {

            try {
                this.#database.exec("ROLLBACK");
            } catch (rollbackError) {
                throw new Error(
                    "Ticket storage rollback failed."
                );
            }

            if (
                error.message.startsWith("Ticket ") ||
                error.message.startsWith("Stored Ticket ")
            ) {
                throw error;
            }

            throw new Error("Ticket storage failed.");

        }

    }

}

module.exports = SqliteTicketStore;
