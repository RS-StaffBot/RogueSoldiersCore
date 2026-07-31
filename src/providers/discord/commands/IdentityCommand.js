const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const BaseCommand = require("./BaseCommand");

class IdentityCommand extends BaseCommand {

    constructor({ identityModuleResolver } = {}) {

        if (
            !identityModuleResolver ||
            typeof identityModuleResolver.resolve !== "function"
        ) {
            throw new Error(
                "Discord Identity Module resolver boundary is invalid."
            );
        }

        super(
            new SlashCommandBuilder()
                .setName("identity")
                .setDescription("Manages your private game identity link.")
                .setDMPermission(false)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("status")
                        .setDescription(
                            "Shows your private identity-link status."
                        )
                )
        );

        this.identityModuleResolver = identityModuleResolver;

    }

    async execute(interaction) {

        if (!interaction.guild) {
            await interaction.reply({
                content: "This command can only be used in a server.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand(true);

        if (subcommand !== "status") {
            throw new Error(
                `Unsupported identity command subcommand: ${subcommand}`
            );
        }

        const resolution = this.identityModuleResolver.resolve();

        if (
            !resolution ||
            resolution.available !== true ||
            !resolution.service ||
            typeof resolution.service.getOwnStatus !== "function"
        ) {
            await interaction.reply({
                content:
                    "Identity linking is currently unavailable. Please try again later.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        let status;

        try {
            status = resolution.service.getOwnStatus(
                interaction.user.id
            );
        } catch {
            await interaction.reply({
                content:
                    "Unable to read your identity-link status right now.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.reply({
            content: this.createStatusMessage(status),
            flags: MessageFlags.Ephemeral
        });

    }

    createStatusMessage(status) {

        if (
            !status ||
            typeof status !== "object" ||
            Array.isArray(status) ||
            typeof status.linked !== "boolean"
        ) {
            return "Unable to read your identity-link status right now.";
        }

        if (!status.linked) {
            return "You do not currently have a linked game identity.";
        }

        if (status.status === "VERIFIED") {
            return "Your game identity is verified and linked.";
        }

        if (status.status === "PENDING") {
            return "Your game identity link is pending verification.";
        }

        return "Unable to read your identity-link status right now.";

    }

}

module.exports = IdentityCommand;
