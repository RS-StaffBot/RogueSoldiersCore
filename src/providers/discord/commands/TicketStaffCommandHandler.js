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
        subcommand
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
                    tickets
                );
                return;

            case "assign":
                await this.assignTicket(
                    interaction,
                    tickets
                );
                return;

            case "unassign":
                await this.unassignTicket(
                    interaction,
                    tickets
                );
                return;

            case "close":
                await this.closeAnyTicket(
                    interaction,
                    tickets
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
                actorPermissions
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

        if (allTickets.length === 0) {
            await interaction.reply({
                content: "There are no tickets.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const displayedTickets = allTickets.slice(
            0,
            MAX_LISTED_TICKETS
        );
        const ticketLines = displayedTickets.map(
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
            allTickets.length -
            displayedTickets.length;

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

        const messages = tickets.listMessages(
            ticket.id,
            actorId,
            actorPermissions
        );
        const displayedMessages = messages.slice(
            -MAX_DISPLAYED_MESSAGES
        );
        const messageLines = displayedMessages.map(
            message =>
                `- **${message.id}** | ` +
                `<@${message.authorId}>: ` +
                this.formatMessageContent(
                    message.content
                )
        );

        if (messages.length === 0) {
            messageLines.push("None");
        } else if (
            messages.length >
            displayedMessages.length
        ) {
            messageLines.unshift(
                "Showing the latest " +
                `${displayedMessages.length} of ` +
                `${messages.length}:`
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
                `Messages: ${messages.length}`,
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

    async addStaffMessage(interaction, tickets) {

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

        await interaction.reply({
            content:
                `Added staff message **${message.id}** ` +
                `to ticket **${message.ticketId}**.`,
            flags: MessageFlags.Ephemeral
        });

    }

    async assignTicket(interaction, tickets) {

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

        await interaction.reply({
            content:
                `Assigned ticket **${ticket.id}** to ` +
                `<@${ticket.assigneeId}>.`,
            flags: MessageFlags.Ephemeral
        });

    }

    async unassignTicket(interaction, tickets) {

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

        await interaction.reply({
            content: `Unassigned ticket **${ticket.id}**.`,
            flags: MessageFlags.Ephemeral
        });

    }

    async closeAnyTicket(interaction, tickets) {

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

        await interaction.reply({
            content: `Closed ticket **${ticket.id}**.`,
            flags: MessageFlags.Ephemeral
        });

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
