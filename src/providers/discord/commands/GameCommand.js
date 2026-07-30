const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const BaseCommand = require("./BaseCommand");
const DiscordGameAdministrationResultFormatter = require(
    "../services/DiscordGameAdministrationResultFormatter"
);
const DiscordGamePlayerTargetValidator = require(
    "../services/DiscordGamePlayerTargetValidator"
);
const DiscordGameServerProviderResolver = require(
    "../services/DiscordGameServerProviderResolver"
);

const MAXIMUM_SAY_MESSAGE_LENGTH = 200;

class GameCommand extends BaseCommand {

    constructor({
        gameAdministrationResultFormatter =
        new DiscordGameAdministrationResultFormatter(),
        gameCommandAuthorizer,
        gamePlayerTargetValidator =
        new DiscordGamePlayerTargetValidator(),
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

        if (
            !gamePlayerTargetValidator ||
            typeof gamePlayerTargetValidator.validateOnlineEntityId !==
                "function" ||
            typeof gamePlayerTargetValidator.validateReason !== "function"
        ) {
            throw new Error(
                "Discord game player target validator boundary is invalid."
            );
        }

        if (
            !gameAdministrationResultFormatter ||
            typeof gameAdministrationResultFormatter.formatKick !== "function"
        ) {
            throw new Error(
                "Discord game administration result formatter boundary is invalid."
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
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("say")
                        .setDescription(
                            "Sends a staff message to the game server."
                        )
                        .addStringOption(option =>
                            option
                                .setName("message")
                                .setDescription(
                                    "The message to send in game."
                                )
                                .setRequired(true)
                                .setMinLength(1)
                                .setMaxLength(MAXIMUM_SAY_MESSAGE_LENGTH)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("kick")
                        .setDescription(
                            "Kicks an online player from the game server."
                        )
                        .addStringOption(option =>
                            option
                                .setName("entity-id")
                                .setDescription(
                                    "The exact online entity ID from /game players."
                                )
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("reason")
                                .setDescription("The staff kick reason.")
                                .setRequired(true)
                                .setMinLength(1)
                                .setMaxLength(200)
                        )
                )
        );

        this.gameAdministrationResultFormatter =
            gameAdministrationResultFormatter;
        this.gameCommandAuthorizer = gameCommandAuthorizer;
        this.gamePlayerTargetValidator = gamePlayerTargetValidator;
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

        if (subcommand === "say") {
            await this.executeSay(interaction);
            return;
        }

        if (subcommand === "kick") {
            await this.executeKick(interaction);
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

        const execution = await this.executeRemoteCommand(
            resolution.service,
            "gettime"
        );

        if (!execution.success) {
            await interaction.editReply({ content: execution.message });
            return;
        }

        const timeLine = this.findTimeLine(execution.result);

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

        const execution = await this.executeRemoteCommand(
            resolution.service,
            "listplayers"
        );

        if (!execution.success) {
            await interaction.editReply({ content: execution.message });
            return;
        }

        const players = this.parsePlayers(execution.result);

        await interaction.editReply({
            content: this.createPlayersMessage(players)
        });

    }

    async executeSay(interaction) {

        const message = interaction.options.getString("message", true);

        if (!this.isValidSayMessage(message)) {
            await interaction.reply({
                content:
                    "The game message must be 1-200 characters and cannot contain quotes, backslashes, or control characters.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

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

        const execution = await this.executeRemoteCommand(
            resolution.service,
            `say "${message}"`
        );

        await interaction.editReply({
            content: execution.success
                ? "The message was sent to the 7 Days to Die server."
                : execution.message
        });

    }

    async executeKick(interaction) {

        const entityId = this.gamePlayerTargetValidator
            .validateOnlineEntityId(
                interaction.options.getString("entity-id", true)
            );

        if (!entityId.valid) {
            await interaction.reply({
                content: entityId.message,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const reason = this.gamePlayerTargetValidator.validateReason(
            interaction.options.getString("reason", true)
        );

        if (!reason.valid) {
            await interaction.reply({
                content: reason.message,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

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

        const execution = await this.executeRemoteCommand(
            resolution.service,
            `kick ${entityId.value} "${reason.value}"`
        );

        if (!execution.success) {
            await interaction.editReply({ content: execution.message });
            return;
        }

        const formatted =
            this.gameAdministrationResultFormatter.formatKick(
                execution.result
            );

        await interaction.editReply({ content: formatted.message });

    }

    async executeRemoteCommand(service, command) {

        try {
            const result = await service.executeCommand(command);

            if (!result || typeof result !== "object") {
                return this.createExecutionFailure(
                    "The game server returned an invalid response."
                );
            }

            if (result.status === undefined || result.status === "SUCCESS") {
                return Object.freeze({
                    success: true,
                    result
                });
            }

            if (result.status === "TIMEOUT") {
                return this.createExecutionFailure(
                    "The game server did not respond in time."
                );
            }

            if (result.status === "DISCONNECTED") {
                return this.createExecutionFailure(
                    "The game server connection was lost."
                );
            }

            return this.createExecutionFailure(
                "The game server could not complete the command."
            );
        } catch {
            return this.createExecutionFailure(
                "The game server command could not be completed."
            );
        }

    }

    createExecutionFailure(message) {
        return Object.freeze({
            success: false,
            message,
            result: null
        });
    }

    isValidSayMessage(message) {
        return Boolean(
            typeof message === "string" &&
            message.length >= 1 &&
            message.length <= MAXIMUM_SAY_MESSAGE_LENGTH &&
            message.trim() === message &&
            !/["\\\u0000-\u001f\u007f]/u.test(message)
        );
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
