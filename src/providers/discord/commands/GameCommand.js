const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const BaseCommand = require("./BaseCommand");
const DiscordGameServerProviderResolver = require(
    "../services/DiscordGameServerProviderResolver"
);

class GameCommand extends BaseCommand {

    constructor({
        gameCommandAuthorizer,
        gameServerProviderResolver
    } = {}) {

        if (
            !gameCommandAuthorizer ||
            typeof gameCommandAuthorizer.getRequiredPermission !== "function" ||
            typeof gameCommandAuthorizer.isAuthorized !== "function"
        ) {
            throw new Error(
                "Discord game command authorizer boundary is invalid."
            );
        }

        if (
            !gameServerProviderResolver ||
            typeof gameServerProviderResolver.resolve !== "function"
        ) {
            throw new Error(
                "Discord game server Provider resolver boundary is invalid."
            );
        }

        const requiredPermission =
            gameCommandAuthorizer.getRequiredPermission();

        super(
            new SlashCommandBuilder()
                .setName("game")
                .setDescription("Manages the connected game server.")
                .setDMPermission(false)
                .setDefaultMemberPermissions(requiredPermission)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("status")
                        .setDescription(
                            "Shows whether the game server Provider is available."
                        )
                )
        );

        this.gameCommandAuthorizer = gameCommandAuthorizer;
        this.gameServerProviderResolver =
            gameServerProviderResolver;

    }

    async execute(interaction) {

        if (!interaction.guild) {
            await interaction.reply({
                content: "This command can only be used in a server.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (
            !this.gameCommandAuthorizer.isAuthorized(
                interaction.memberPermissions
            )
        ) {
            await interaction.reply({
                content:
                    "You do not have permission to manage the game server.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand(true);

        if (subcommand !== "status") {
            throw new Error(
                `Unsupported game command subcommand: ${subcommand}`
            );
        }

        const resolution =
            this.gameServerProviderResolver.resolve();

        await interaction.reply({
            content: this.createStatusMessage(resolution),
            flags: MessageFlags.Ephemeral
        });

    }

    createStatusMessage(resolution) {

        if (
            resolution &&
            resolution.status ===
                DiscordGameServerProviderResolver.Status.AVAILABLE &&
            resolution.available === true
        ) {
            return "7 Days to Die server control is available.";
        }

        if (
            resolution &&
            resolution.status ===
                DiscordGameServerProviderResolver.Status.PROVIDER_NOT_READY
        ) {
            return "7 Days to Die server control is not ready.";
        }

        if (
            resolution &&
            resolution.status ===
                DiscordGameServerProviderResolver.Status.INVALID_PROVIDER_BOUNDARY
        ) {
            return "7 Days to Die server control is unavailable because its Provider boundary is invalid.";
        }

        return "7 Days to Die server control is unavailable.";

    }

}

module.exports = GameCommand;
