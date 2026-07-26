const TicketMigrations = Object.freeze([
    Object.freeze({
        id: "003_create_ticket_aggregate",
        sql: `
            CREATE TABLE tickets (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                creator_id TEXT NOT NULL CHECK (
                    length(trim(creator_id)) > 0
                ),
                assignee_id TEXT CHECK (
                    assignee_id IS NULL OR
                    length(trim(assignee_id)) > 0
                ),
                status TEXT NOT NULL CHECK (
                    status IN ('OPEN', 'CLOSED')
                ),
                created_at TEXT NOT NULL CHECK (
                    length(trim(created_at)) > 0
                )
            ) STRICT;

            CREATE TABLE ticket_messages (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_sequence INTEGER NOT NULL
                    REFERENCES tickets(sequence),
                author_id TEXT NOT NULL CHECK (
                    length(trim(author_id)) > 0
                ),
                content TEXT NOT NULL CHECK (
                    length(trim(content)) > 0
                ),
                created_at TEXT NOT NULL CHECK (
                    length(trim(created_at)) > 0
                )
            ) STRICT;

            CREATE INDEX tickets_creator_order
            ON tickets(creator_id, sequence);

            CREATE INDEX tickets_status_order
            ON tickets(status, sequence);

            CREATE INDEX tickets_assignee_order
            ON tickets(assignee_id, sequence);

            CREATE INDEX ticket_messages_parent_order
            ON ticket_messages(ticket_sequence, sequence)
        `
    })
]);

module.exports = TicketMigrations;
