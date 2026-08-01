const {
    MessageFlags,
    TimestampStyles,
    time
} = require("discord.js");

const TicketPermission = require(
    "../../../shared/permissions/TicketPermission"
);
const DiscordPermissionService = require(
    "../services/DiscordPermissionService"
);

const MAX_LISTED_TICKETS = 20;
const MAX_DISPLAYED_MESSAGES = 5;
const MAX_DISPLAYED_MESSAGE_LENGTH = 200;

class TicketStaffCommandHandler {

    configure(group) {

        return group
            .setName("staff")
            .setDescription(
                "Manage tickets as Discord staff."
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("list")
                    .setDescription("List all tickets.")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("view")
                    .setDescription("View any ticket.")
                    .addStringOption(option =>
                        option
                            .setName("id")
                            .setDescription("The ticket ID.")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("message")
                    .setDescription(
                        "Respond to any ticket."
                    )
                    .addStringOption(option =>
                        option
                            .setName("id")
                            .setDescription("The ticket ID.")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option
                            .setName("content")
                            .setDescription(
                                "The message to add."
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("assign")
                    .setDescription(
                        "Assign an open ticket."
                    )
                    .addStringOption(option =>
                        option
                            .setName("id")
                            .setDescription("The ticket ID.")
                            .setRequired(true)
                    )
                    .addUserOption(option =>
                        option
                            .setName("member")
                            .setDescription(
                                "The staff member to assign."
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("unassign")
                    .setDescription(
                        "Unassign an open ticket."
                    )
                    .addStringOption(option =>
                        option
                            .setName("id")
                            .setDescription("The ticket ID.")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("close")
                    .setDescription(
                        "Close any open ticket."
                    )
                    .addStringOption(option =>
                        option
                            .setName("id")
                            .setDescription("The ticket ID.")
                            .setRequired(true)
                    )
            );

    }

    getTranslatedTicketPermissions(interaction) {

        return DiscordPermissionService
            .listGrantedPermissions(
                interaction.memberPermissions,
                Object.values(TicketPermission)
            );

    }

    async execute(
        interaction,
        tickets,
        subcommand,
        auditService = null
    ) {

        switch (subcommand) {

            case "list":
                await this.listAllTickets(
                    interaction,
                    tickets
                );
                return;

            case "view":
                await this.viewAnyTicket(
                    interaction,
                    tickets
                );
                return;

            case "message":
                await this.addStaffMessage(
                    interaction,
                    tickets,
                    auditService
                );
                return;

            case "assign":
                await this.assignTicket(
                    interaction,
                    tickets,
                    auditService
                );
                return;

            case "unassign":
                await this.unassignTicket(
                    interaction,
                    tickets,
                    auditService
                );
                return;

            case "close":
                await this.closeAnyTicket(
                    interaction,
                    tickets,
                    auditService
                );
                return;

            default:
                throw new Error(
                    "Unsupported staff ticket subcommand: " +
                    subcommand
                );

        }

    }

    async listAllTickets(interaction, tickets) {

        const actorPermissions =
            this.getTranslatedTicketPermissions(
                interaction
            );

        let allTickets;

        try {
            allTickets = tickets.listTickets(
                actorPermissions,
                {
                    limit: MAX_LISTED_TICKETS
                }
            );
        } catch (error) {

            if (
                await this.replyToError(
                    interaction,
                    error
                )
            ) {
                return;
            }

            throw error;

        }

        const totalTicketCount = tickets.getTicketCount(
            actorPermissions
        );

        if (totalTicketCount === 0) {
            await interaction.reply({
                content: "There are no tickets.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const ticketLines = allTickets.map(
            ticket => {

                const assignment = ticket.assigneeId
                    ? `Assigned to <@${ticket.assigneeId}>`
                    : "Unassigned";

                return (
                    `- **${ticket.id}** | ` +
                    `${ticket.status} | ` +
                    `Creator: <@${ticket.creatorId}> | ` +
                    assignment
                );

            }
        );
        const remainingCount =
            totalTicketCount - allTickets.length;

        if (remainingCount > 0) {
            ticketLines.push(
                `...and ${remainingCount} more ticket(s).`
            );
        }

        await interaction.reply({
            content: [
                "All tickets:",
                ...ticketLines
            ].join("\n"),
            flags: MessageFlags.Ephemeral
        });

    }

    async viewAnyTicket(interaction, tickets) {

        const ticketId = interaction.options.getString(
            "id",
            true
        );
        const actorId = interaction.user.id;
        const actorPermissions =
            this.getTranslatedTicketPermissions(
                interaction
            );

        let ticket;

        try {
            ticket = tickets.getTicket(
                ticketId,
                actorId,
                actorPermissions
            );
        } catch (error) {

            if (
                await this.replyToError(
                    interaction,
                    error,
                    ticketId
                )
            ) {
                return;
            }

            throw error;

        }

        if (!ticket) {
            await interaction.reply({
                content: `Ticket not found: ${ticketId}`,
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const messageCount = tickets.getMessageCount(
            ticket.id,
            actorId,
            actorPermissions
        );
        const displayedMessages = tickets.listMessages(
            ticket.id,
            actorId,
            actorPermissions,
            {
                limit: MAX_DISPLAYED_MESSAGES,
                latest: true
            }
        );
        const messageLines = displayedMessages.map(
            message =>
                `- **${message.id}** | ` +
                `<@${message.authorId}>: ` +
                this.formatMessageContent(
                    message.content
                )
        );

        if (messageCount === 0) {
            messageLines.push("None");
        } else if (
            messageCount >
            displayedMessages.length
        ) {
            messageLines.unshift(
                "Showing the latest " +
                `${displayedMessages.length} of ` +
                `${messageCount}:`
            );
        }

        const assignment = ticket.assigneeId
            ? `<@${ticket.assigneeId}>`
            : "Unassigned";
        const createdAt = time(
            new Date(ticket.createdAt),
            TimestampStyles.LongDateTime
        );

        await interaction.reply({
            content: [
                `Ticket **${ticket.id}**`,
                `Creator: <@${ticket.creatorId}>`,
                `Status: ${ticket.status}`,
                `Assignee: ${assignment}`,
                `Created: ${createdAt}`,
                `Messages: ${messageCount}`,
                "Recent messages:",
                ...messageLines
            ].join("\n"),
            flags: MessageFlags.Ephemeral
        });

    }

    formatMessageContent(content) {

        const normalizedContent = content.replace(
            /\s+/g,
            " "
        );

        if (
            normalizedContent.length <=
            MAX_DISPLAYED_MESSAGE_LENGTH
        ) {
            return normalizedContent;
        }

        return (
            normalizedContent.slice(
                0,
                MAX_DISPLAYED_MESSAGE_LENGTH - 3
            ) + "..."
        );

    }

    async addStaffMessage(
        interaction,
        tickets,
        auditService
    ) {

        const ticketId = interaction.options.getString(
            "id",
            true
        );
        const content = interaction.options.getString(
            "content",
            true
        );
        const actorPermissions =
            this.getTranslatedTicketPermissions(
                interaction
            );

        let message;

        try {
            message = tickets.addMessage(
                ticketId,
                interaction.user.id,
                content,
                new Date(),
                actorPermissions
            );
        } catch (error) {
            this.recordAudit(
                auditService,
                interaction,
                "message",
                ticketId,
                this.resolveAuditFailure(error, ticketId)
            );

            if (
                await this.replyToError(
                    interaction,
                    error,
                    ticketId
                )
            ) {
                return;
            }

            throw error;
        }

        this.recordAudit(
            auditService,
            interaction,
            "message",
            message.ticketId,
            {
                outcome: "SUCCESS",
                status: "succeeded"
            }
        );

        await interaction.reply({
            content:
                `Added staff message **${message.id}** ` +
                `to ticket **${message.ticketId}**.`,
            flags: MessageFlags.Ephemeral
        });

    }

    async assignTicket(
        interaction,
        tickets,
        auditService
    ) {

        const ticketId = interaction.options.getString(
            "id",
            true
        );
        const assignee = interaction.options.getUser(
            "member",
            true
        );
        const actorPermissions =
            this.getTranslatedTicketPermissions(
                interaction
            );

        let ticket;

        try {
            ticket = tickets.assignTicket(
                ticketId,
                assignee.id,
                actorPermissions
            );
        } catch (error) {
            this.recordAudit(
                auditService,
                interaction,
                "assign",
                ticketId,
                this.resolveAuditFailure(error, ticketId)
            );

            if (
                await this.replyToError(
                    interaction,
                    error,
                    ticketId
                )
            ) {
                return;
            }

            throw error;
        }

        this.recordAudit(
            auditService,
            interaction,
            "assign",
            ticket.id,
            {
                outcome: "SUCCESS",
                status: "succeeded"
            }
        );

        await interaction.reply({
            content:
                `Assigned ticket **${ticket.id}** to ` +
                `<@${ticket.assigneeId}>.`,
            flags: MessageFlags.Ephemeral
        });

    }

    async unassignTicket(
        interaction,
        tickets,
        auditService
    ) {

        const ticketId = interaction.options.getString(
            "id",
            true
        );
        const actorPermissions =
            this.getTranslatedTicketPermissions(
                interaction
            );

        let ticket;

        try {
            ticket = tickets.unassignTicket(
                ticketId,
                actorPermissions
            );
        } catch (error) {
            this.recordAudit(
                auditService,
                interaction,
                "unassign",
                ticketId,
                this.resolveAuditFailure(error, ticketId)
            );

            if (
                await this.replyToError(
                    interaction,
                    error,
                    ticketId
                )
            ) {
                return;
            }

            throw error;
        }

        this.recordAudit(
            auditService,
            interaction,
            "unassign",
            ticket.id,
            {
                outcome: "SUCCESS",
                status: "succeeded"
            }
        );

        await interaction.reply({
            content: `Unassigned ticket **${ticket.id}**.`,
            flags: MessageFlags.Ephemeral
        });

    }

    async closeAnyTicket(
        interaction,
        tickets,
        auditService
    ) {

        const ticketId = interaction.options.getString(
            "id",
            true
        );
        const actorPermissions =
            this.getTranslatedTicketPermissions(
                interaction
            );

        let ticket;

        try {
            ticket = tickets.closeTicket(
                ticketId,
                interaction.user.id,
                actorPermissions
            );
        } catch (error) {
            this.recordAudit(
                auditService,
                interaction,
                "close",
                ticketId,
                this.resolveAuditFailure(error, ticketId)
            );

            if (
                await this.replyToError(
                    interaction,
                    error,
                    ticketId
                )
            ) {
                return;
            }

            throw error;
        }

        this.recordAudit(
            auditService,
            interaction,
            "close",
            ticket.id,
            {
                outcome: "SUCCESS",
                status: "succeeded"
            }
        );

        await interaction.reply({
            content: `Closed ticket **${ticket.id}**.`,
            flags: MessageFlags.Ephemeral
        });

    }

    recordAudit(
        auditService,
        interaction,
        action,
        ticketId,
        {
            outcome,
            status
        }
    ) {

        if (!auditService) {
            return false;
        }

        try {
            return auditService.recordAttempt({
                actorId: interaction.user.id,
                action,
                targetId: this.resolveAuditTargetId(
                    ticketId
                ),
                outcome,
                status
            });
        } catch {
            return false;
        }

    }

    resolveAuditTargetId(ticketId) {

        if (
            typeof ticketId === "string" &&
            /^ticket-[1-9]\d*$/.test(ticketId)
        ) {
            return ticketId;
        }

        return "unresolved-ticket";

    }
    resolveAuditFailure(error, ticketId) {

        const permissionErrors = new Set([
            "Ticket responses are limited to its creator " +
                "or actors with respond permission.",
            "Ticket assignment permission is required.",
            "Ticket closing is limited to its creator " +
                "or actors with close permission."
        ]);

        if (permissionErrors.has(error.message)) {
            return {
                outcome: "DENIED",
                status: "permission-denied"
            };
        }

        if (
            error.message === "Ticket ID is required." ||
            error.message ===
                "Ticket message content is required." ||
            error.message ===
                "Ticket assignee ID is required."
        ) {
            return {
                outcome: "FAILED",
                status: "validation-failed"
            };
        }

        if (
            typeof ticketId === "string" &&
            error.message ===
                `Ticket not found: ${ticketId}`
        ) {
            return {
                outcome: "FAILED",
                status: "ticket-not-found"
            };
        }

        if (
            error.message ===
                "Ticket messages require an open ticket." ||
            error.message ===
                "Ticket assignments require an open ticket." ||
            error.message ===
                "Ticket transition from CLOSED to CLOSED " +
                    "is not allowed."
        ) {
            return {
                outcome: "FAILED",
                status: "ticket-not-open"
            };
        }

        if (
            error.message.startsWith(
                "Ticket is already assigned to:"
            )
        ) {
            return {
                outcome: "FAILED",
                status: "already-assigned"
            };
        }

        if (error.message === "Ticket is not assigned.") {
            return {
                outcome: "FAILED",
                status: "not-assigned"
            };
        }

        return {
            outcome: "FAILED",
            status: "persistence-failed"
        };

    }

    async replyToError(
        interaction,
        error,
        ticketId = null
    ) {

        const permissionErrors = new Set([
            "Ticket view-all permission is required.",
            "Ticket access is limited to its creator " +
                "or actors with view-all permission.",
            "Ticket history is limited to its creator " +
                "or actors with view-all permission.",
            "Ticket responses are limited to its creator " +
                "or actors with respond permission.",
            "Ticket assignment permission is required.",
            "Ticket closing is limited to its creator " +
                "or actors with close permission."
        ]);

        let content = null;

        if (permissionErrors.has(error.message)) {
            content =
                "You do not have permission to perform " +
                "that staff ticket operation.";
        } else if (
            error.message === "Ticket ID is required."
        ) {
            content = "A ticket ID is required.";
        } else if (
            ticketId !== null &&
            error.message ===
                `Ticket not found: ${ticketId}`
        ) {
            content = error.message;
        } else if (
            error.message ===
            "Ticket message content is required."
        ) {
            content = "A ticket message is required.";
        } else if (
            error.message ===
            "Ticket messages require an open ticket."
        ) {
            content =
                "Messages can only be added to open tickets.";
        } else if (
            error.message ===
            "Ticket assignments require an open ticket."
        ) {
            content =
                "Assignments can only be changed on open tickets.";
        } else if (
            error.message.startsWith(
                "Ticket is already assigned to:"
            )
        ) {
            content = error.message;
        } else if (
            error.message === "Ticket is not assigned."
        ) {
            content = error.message;
        } else if (
            error.message ===
            "Ticket transition from CLOSED to CLOSED " +
                "is not allowed."
        ) {
            content = "That ticket is already closed.";
        }

        if (content === null) {
            return false;
        }

        await interaction.reply({
            content,
            flags: MessageFlags.Ephemeral
        });

        return true;

    }

}

module.exports = new TicketStaffCommandHandler();
