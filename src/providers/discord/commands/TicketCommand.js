const {
    MessageFlags,
    SlashCommandBuilder,
    TimestampStyles,
    time
} = require("discord.js");

const Registry = require("../../../core/Registry");
const BaseCommand = require("./BaseCommand");
const TicketStaffCommandHandler = require(
    "./TicketStaffCommandHandler"
);

const MAX_LISTED_TICKETS = 20;

class TicketCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("ticket")
                .setDescription("Manage your tickets.")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("create")
                        .setDescription("Create a new ticket.")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("list")
                        .setDescription("List your tickets.")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("view")
                        .setDescription("View one of your tickets.")
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
                            "Add a message to one of your tickets."
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
                                .setDescription("The message to add.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("close")
                        .setDescription("Close one of your tickets.")
                        .addStringOption(option =>
                            option
                                .setName("id")
                                .setDescription("The ticket ID.")
                                .setRequired(true)
                        )
                )
                .addSubcommandGroup(group =>
                    TicketStaffCommandHandler.configure(
                        group
                    )
                )
        );

    }

    getTicketModule() {

        const moduleManager = Registry.get("modules");
        const tickets = moduleManager.get("Tickets");

        if (!tickets) {
            throw new Error(
                "Ticket Module is not available."
            );
        }

        return tickets;

    }

    async execute(interaction) {

        const tickets = this.getTicketModule();
        const subcommandGroup =
            typeof interaction.options
                .getSubcommandGroup === "function"
                ? interaction.options.getSubcommandGroup(
                    false
                )
                : null;
        const subcommand =
            interaction.options.getSubcommand();

        if (subcommandGroup === "staff") {
            await TicketStaffCommandHandler.execute(
                interaction,
                tickets,
                subcommand
            );

            return;
        }

        if (subcommandGroup !== null) {
            throw new Error(
                "Unsupported ticket subcommand group: " +
                subcommandGroup
            );
        }

        switch (subcommand) {

            case "create":
                await this.createTicket(
                    interaction,
                    tickets
                );
                return;

            case "list":
                await this.listTickets(
                    interaction,
                    tickets
                );
                return;

            case "view":
                await this.viewTicket(
                    interaction,
                    tickets
                );
                return;

            case "message":
                await this.addMessage(
                    interaction,
                    tickets
                );
                return;

            case "close":
                await this.closeTicket(
                    interaction,
                    tickets
                );
                return;

            default:
                throw new Error(
                    `Unsupported ticket subcommand: ${subcommand}`
                );

        }

    }

    async createTicket(interaction, tickets) {

        const ticket = tickets.createTicket(
            interaction.user.id
        );

        await interaction.reply({
            content: [
                `Created ticket **${ticket.id}**.`,
                `Status: ${ticket.status}`
            ].join("\n"),
            flags: MessageFlags.Ephemeral
        });

    }

    async listTickets(interaction, tickets) {

        const userId = interaction.user.id;
        const ownedTickets =
            tickets.listTicketsForCreator(
                userId,
                userId,
                [],
                {
                    limit: MAX_LISTED_TICKETS
                }
            );
        const totalTicketCount =
            tickets.getTicketCountForCreator(
                userId,
                userId
            );

        if (totalTicketCount === 0) {
            await interaction.reply({
                content: "You do not have any tickets.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const ticketLines = ownedTickets.map(
            ticket => {

                const assignment = ticket.assigneeId
                    ? `Assigned to <@${ticket.assigneeId}>`
                    : "Unassigned";

                return (
                    `- **${ticket.id}** | ` +
                    `${ticket.status} | ${assignment}`
                );

            }
        );
        const remainingCount =
            totalTicketCount - ownedTickets.length;

        if (remainingCount > 0) {
            ticketLines.push(
                `...and ${remainingCount} more ticket(s).`
            );
        }

        await interaction.reply({
            content: [
                "Your tickets:",
                ...ticketLines
            ].join("\n"),
            flags: MessageFlags.Ephemeral
        });

    }

    async viewTicket(interaction, tickets) {

        const ticketId = interaction.options.getString(
            "id",
            true
        );
        const userId = interaction.user.id;

        let ticket;

        try {
            ticket = tickets.getTicket(
                ticketId,
                userId
            );
        } catch (error) {

            if (
                error.message ===
                "Ticket ID is required."
            ) {
                await interaction.reply({
                    content: "A ticket ID is required.",
                    flags: MessageFlags.Ephemeral
                });

                return;
            }

            if (
                error.message !==
                "Ticket access is limited to its creator " +
                    "or actors with view-all permission."
            ) {
                throw error;
            }

            await interaction.reply({
                content:
                    "You can only view your own tickets.",
                flags: MessageFlags.Ephemeral
            });

            return;

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
            userId
        );
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
                `Status: ${ticket.status}`,
                `Assignee: ${assignment}`,
                `Created: ${createdAt}`,
                `Messages: ${messageCount}`
            ].join("\n"),
            flags: MessageFlags.Ephemeral
        });

    }

    async addMessage(interaction, tickets) {

        const ticketId = interaction.options.getString(
            "id",
            true
        );
        const content = interaction.options.getString(
            "content",
            true
        );
        const userId = interaction.user.id;

        let message;

        try {
            message = tickets.addMessage(
                ticketId,
                userId,
                content
            );
        } catch (error) {

            const expectedMessages = new Map([
                [
                    "Ticket ID is required.",
                    "A ticket ID is required."
                ],
                [
                    `Ticket not found: ${ticketId}`,
                    `Ticket not found: ${ticketId}`
                ],
                [
                    "Ticket responses are limited to its " +
                        "creator or actors with respond " +
                        "permission.",
                    "You can only add messages to your " +
                        "own tickets."
                ],
                [
                    "Ticket messages require an open ticket.",
                    "Messages can only be added to open tickets."
                ],
                [
                    "Ticket message content is required.",
                    "A ticket message is required."
                ]
            ]);
            const response = expectedMessages.get(
                error.message
            );

            if (!response) {
                throw error;
            }

            await interaction.reply({
                content: response,
                flags: MessageFlags.Ephemeral
            });

            return;

        }

        await interaction.reply({
            content:
                `Added message **${message.id}** to ` +
                `ticket **${message.ticketId}**.`,
            flags: MessageFlags.Ephemeral
        });

    }

    async closeTicket(interaction, tickets) {

        const ticketId = interaction.options.getString(
            "id",
            true
        );
        const userId = interaction.user.id;

        let ticket;

        try {
            ticket = tickets.closeTicket(
                ticketId,
                userId
            );
        } catch (error) {

            const expectedMessages = new Map([
                [
                    "Ticket ID is required.",
                    "A ticket ID is required."
                ],
                [
                    `Ticket not found: ${ticketId}`,
                    `Ticket not found: ${ticketId}`
                ],
                [
                    "Ticket closing is limited to its " +
                        "creator or actors with close " +
                        "permission.",
                    "You can only close your own tickets."
                ]
            ]);
            const response = expectedMessages.get(
                error.message
            );

            if (response) {
                await interaction.reply({
                    content: response,
                    flags: MessageFlags.Ephemeral
                });

                return;
            }

            if (
                error.message ===
                "Ticket transition from CLOSED to CLOSED " +
                    "is not allowed."
            ) {
                await interaction.reply({
                    content: "That ticket is already closed.",
                    flags: MessageFlags.Ephemeral
                });

                return;
            }

            throw error;

        }

        await interaction.reply({
            content: `Closed ticket **${ticket.id}**.`,
            flags: MessageFlags.Ephemeral
        });

    }

}

module.exports = TicketCommand;
