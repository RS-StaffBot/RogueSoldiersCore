const { randomBytes } = require("node:crypto");

const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const BaseCommand = require("./BaseCommand");
const SevenDaysToDieIdentityProofEvaluator = require(
    "../../sevendaystodie/identity/" +
    "SevenDaysToDieIdentityProofEvaluator"
);

class IdentityCommand extends BaseCommand {

    constructor({
        challengeGenerator = () =>
            "RS-LINK-" + randomBytes(12).toString("hex").toUpperCase(),
        clock = () => Date.now(),
        identityModuleResolver,
        identityProofEvaluator =
        new SevenDaysToDieIdentityProofEvaluator(),
        identityProofProviderResolver = null
    } = {}) {

        if (
            !identityModuleResolver ||
            typeof identityModuleResolver.resolve !== "function"
        ) {
            throw new Error(
                "Discord Identity Module resolver boundary is invalid."
            );
        }

        if (
            identityProofProviderResolver !== null &&
            (
                typeof identityProofProviderResolver !== "object" ||
                typeof identityProofProviderResolver.resolve !== "function"
            )
        ) {
            throw new Error(
                "Discord identity proof Provider resolver boundary is invalid."
            );
        }

        if (
            typeof challengeGenerator !== "function" ||
            typeof clock !== "function" ||
            !identityProofEvaluator ||
            typeof identityProofEvaluator.evaluate !== "function"
        ) {
            throw new Error(
                "Discord identity proof dependencies are invalid."
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
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("link")
                        .setDescription(
                            "Verifies and links your game identity privately."
                        )
                        .addStringOption(option =>
                            option
                                .setName("user-id")
                                .setDescription(
                                    "Your exact combined Steam_ or EOS_ player ID."
                                )
                                .setRequired(true)
                        )
                )
        );

        this.challengeGenerator = challengeGenerator;
        this.clock = clock;
        this.identityModuleResolver = identityModuleResolver;
        this.identityProofEvaluator = identityProofEvaluator;
        this.identityProofProviderResolver =
            identityProofProviderResolver;

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

        if (subcommand === "status") {
            await this.executeStatus(interaction);
            return;
        }

        if (subcommand === "link") {
            await this.executeLink(interaction);
            return;
        }

        throw new Error(
            `Unsupported identity command subcommand: ${subcommand}`
        );

    }

    async executeStatus(interaction) {

        const resolution = this.resolveIdentityModule();

        if (!resolution) {
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

    async executeLink(interaction) {

        const gameUserId = interaction.options.getString(
            "user-id",
            true
        );

        if (!this.isSupportedGameUserId(gameUserId)) {
            await interaction.reply({
                content:
                    "Enter one exact combined Steam_ or EOS_ player ID.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const identityResolution = this.resolveIdentityModule();
        const proofResolution = this.resolveIdentityProofProvider();

        if (!identityResolution || !proofResolution) {
            await interaction.reply({
                content:
                    "Identity linking is currently unavailable. Please try again later.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        let currentStatus;

        try {
            currentStatus = identityResolution.service.getOwnStatus(
                interaction.user.id
            );
        } catch {
            await interaction.reply({
                content:
                    "Unable to begin identity verification right now.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (currentStatus && currentStatus.linked === true) {
            await interaction.reply({
                content:
                    "You already have an active game identity link.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        let challenge;

        try {
            challenge = this.challengeGenerator();
        } catch {
            challenge = null;
        }

        if (!this.isValidChallenge(challenge)) {
            await interaction.reply({
                content:
                    "Unable to begin identity verification right now.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });
        await interaction.editReply({
            content:
                "Send this exact message in 7 Days to Die global chat within five minutes:\n" +
                `\`${challenge}\`\n` +
                "Keep this Discord command open while RSF waits for verification."
        });

        try {

            const evidence = await proofResolution.service
                .collectIdentityProof({
                    challenge,
                    gameUserId
                });
            const evaluatedAt = this.clock();
            const verification = this.identityProofEvaluator.evaluate({
                challenge,
                evidence,
                evaluatedAt,
                gameUserId
            });

            if (
                !verification ||
                verification.verified !== true ||
                verification.outcome !== "VERIFIED"
            ) {
                await interaction.editReply({
                    content:
                        "Identity verification was not completed. No link was created."
                });
                return;
            }

            identityResolution.service.recordVerifiedSelfLink({
                discordUserId: interaction.user.id,
                gameUserId,
                verification,
                verifiedAt: new Date(evaluatedAt)
            });

            await interaction.editReply({
                content:
                    "Your game identity was verified and linked successfully."
            });

        } catch {
            await interaction.editReply({
                content:
                    "Identity verification could not be completed. No link was created."
            });
        }

    }

    resolveIdentityModule() {

        const resolution = this.identityModuleResolver.resolve();

        if (
            !resolution ||
            resolution.available !== true ||
            !resolution.service ||
            typeof resolution.service.getOwnStatus !== "function" ||
            typeof resolution.service.recordVerifiedSelfLink !== "function"
        ) {
            return null;
        }

        return resolution;

    }

    resolveIdentityProofProvider() {

        if (
            !this.identityProofProviderResolver ||
            typeof this.identityProofProviderResolver.resolve !== "function"
        ) {
            return null;
        }

        const resolution =
            this.identityProofProviderResolver.resolve();

        if (
            !resolution ||
            resolution.available !== true ||
            !resolution.service ||
            typeof resolution.service.collectIdentityProof !== "function"
        ) {
            return null;
        }

        return resolution;

    }

    isSupportedGameUserId(gameUserId) {
        return (
            typeof gameUserId === "string" &&
            /^(?:Steam_|EOS_)[A-Za-z0-9]+$/u.test(gameUserId)
        );
    }

    isValidChallenge(challenge) {
        return (
            typeof challenge === "string" &&
            challenge.length >= 16 &&
            challenge.length <= 128 &&
            /^[A-Za-z0-9_-]+$/u.test(challenge)
        );
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
