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
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("time")
                        .setDescription(
                            "Shows the current in-game day and time."
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("players")
                        .setDescription(
                            "Shows the players currently in the game."
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

        if (subcommand === "status") {
            await this.executeStatus(interaction);
            return;
        }

        if (subcommand === "time") {
            await this.executeTime(interaction);
            return;
        }

        if (subcommand === "players") {
            await this.executePlayers(interaction);
            return;
        }

        throw new Error(
            `Unsupported game command subcommand: ${subcommand}`
        );

    }

    async executeStatus(interaction) {

        const resolution =
            this.gameServerProviderResolver.resolve();

        await interaction.reply({
            content: this.createStatusMessage(resolution),
            flags: MessageFlags.Ephemeral
        });

    }

    async executeTime(interaction) {

        const resolution =
            this.gameServerProviderResolver.resolve();

        if (!this.isAvailableResolution(resolution)) {
            await interaction.reply({
                content: this.createStatusMessage(resolution),
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const result = await resolution.service.executeCommand(
            "gettime"
        );
        const timeLine = this.findTimeLine(result);

        await interaction.editReply({
            content: timeLine
                ? `7 Days to Die time: ${timeLine}.`
                : "Unable to read the current 7 Days to Die time."
        });

    }

    async executePlayers(interaction) {

        const resolution =
            this.gameServerProviderResolver.resolve();

        if (!this.isAvailableResolution(resolution)) {
            await interaction.reply({
                content: this.createStatusMessage(resolution),
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const result = await resolution.service.executeCommand(
            "listplayers"
        );
        const players = this.parsePlayers(result);

        await interaction.editReply({
            content: this.createPlayersMessage(players)
        });

    }

    isAvailableResolution(resolution) {
        return Boolean(
            resolution &&
            resolution.available === true &&
            resolution.service &&
            typeof resolution.service.executeCommand === "function"
        );
    }

    findTimeLine(result) {

        if (!result || !Array.isArray(result.responseLines)) {
            return null;
        }

        return result.responseLines.find(line =>
            typeof line === "string" &&
            /^Day \d+, \d{2}:\d{2}$/u.test(line)
        ) || null;

    }

    parsePlayers(result) {

        if (!result || !Array.isArray(result.responseLines)) {
            return null;
        }

        const totalLine = result.responseLines.find(line =>
            typeof line === "string" &&
            /^Total of \d+ in the game$/u.test(line)
        );

        if (!totalLine) {
            return null;
        }

        const totalMatch = /^Total of (\d+) in the game$/u.exec(totalLine);
        const total = Number.parseInt(totalMatch[1], 10);
        const names = result.responseLines
            .map(line => {
                if (typeof line !== "string") {
                    return null;
                }

                const match = /^\d+\. id=\d+, ([^,]+),/u.exec(line);
                return match ? match[1].trim() : null;
            })
            .filter(Boolean);

        if (names.length !== total) {
            return null;
        }

        return Object.freeze({
            names: Object.freeze([...names]),
            total
        });

    }

    createPlayersMessage(players) {

        if (!players) {
            return "Unable to read the current 7 Days to Die player list.";
        }

        if (players.total === 0) {
            return "No players are currently in the 7 Days to Die server.";
        }

        return `Players online (${players.total}): ${players.names.join(", ")}`;

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
