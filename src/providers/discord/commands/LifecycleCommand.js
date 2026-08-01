const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const BaseCommand = require("./BaseCommand");

class LifecycleCommand extends BaseCommand {

    constructor({ authorizer, lifecycleService } = {}) {

        if (
            !authorizer ||
            typeof authorizer.getRequiredPermission !== "function" ||
            typeof authorizer.isAuthorized !== "function" ||
            !lifecycleService ||
            typeof lifecycleService.getStatus !== "function" ||
            typeof lifecycleService.restart !== "function" ||
            typeof lifecycleService.reload !== "function"
        ) {
            throw new Error(
                "Discord lifecycle command boundary is invalid."
            );
        }

        super(
            new SlashCommandBuilder()
                .setName("lifecycle")
                .setDescription(
                    "Manages the hosted game Provider lifecycle."
                )
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    authorizer.getRequiredPermission()
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("status")
                        .setDescription(
                            "Shows the private hosted game Provider status."
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("restart")
                        .setDescription(
                            "Safely restarts the hosted game Provider."
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("reload")
                        .setDescription(
                            "Reloads configuration and atomically replaces the hosted game Provider."
                        )
                )
        );

        this.authorizer = authorizer;
        this.lifecycleService = lifecycleService;

    }

    async execute(interaction) {

        if (!interaction.guild) {
            await this.reply(interaction,
                "This command can only be used in a server."
            );
            return;
        }

        let authorized = false;

        try {
            authorized = this.authorizer.isAuthorized(
                interaction.memberPermissions
            );
        } catch {
            authorized = false;
        }

        if (!authorized) {
            await this.reply(interaction,
                "You do not have permission to manage Provider lifecycle."
            );
            return;
        }

        const subcommand = interaction.options.getSubcommand(true);

        if (subcommand === "status") {
            await this.reply(
                interaction,
                this.formatStatus(this.lifecycleService.getStatus())
            );
            return;
        }

        if (subcommand !== "restart" && subcommand !== "reload") {
            await this.reply(
                interaction,
                "That lifecycle operation is not supported."
            );
            return;
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        let result;

        try {
            result = await this.lifecycleService[subcommand]();
        } catch {
            result = null;
        }

        await interaction.editReply({
            content: this.formatOperation(subcommand, result)
        });

    }

    reply(interaction, content) {
        return interaction.reply({
            content,
            flags: MessageFlags.Ephemeral
        });
    }

    formatStatus(status) {
        if (
            !status ||
            typeof status !== "object" ||
            status.name !== "7 Days to Die" ||
            typeof status.state !== "string" ||
            typeof status.initialized !== "boolean" ||
            typeof status.operational !== "boolean"
        ) {
            return "The hosted game Provider is not currently available.";
        }

        return (
            "7 Days to Die Provider: " + status.state +
            ". Initialized: " + (status.initialized ? "yes" : "no") +
            ". Operational: " + (status.operational ? "yes" : "no") + "."
        );
    }

    formatOperation(operation, result) {
        const label = operation === "reload" ? "reload" : "restart";

        if (
            result &&
            typeof result === "object" &&
            result.succeeded === true &&
            result.state === "RUNNING"
        ) {
            return `The hosted game Provider ${label} completed successfully.`;
        }

        if (result?.outcome === "BUSY") {
            return "Another lifecycle operation is already in progress.";
        }

        if (result?.outcome === "INVALID_STATE") {
            return "The hosted game Provider is not in a valid state for that operation.";
        }

        if (
            result?.outcome === "NOT_FOUND" ||
            result?.outcome === "NOT_INITIALIZED"
        ) {
            return "The hosted game Provider is not currently available.";
        }

        return `The hosted game Provider ${label} did not complete.`;
    }

}

module.exports = LifecycleCommand;
