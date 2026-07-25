const {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require("discord.js");

const Registry = require("../../../core/Registry");
const BaseCommand = require("./BaseCommand");
const DiscordModerationGuard = require(
    "../services/DiscordModerationGuard"
);
const DiscordPermissionService = require(
    "../services/DiscordPermissionService"
);
const ModerationAction = require(
    "../../../modules/moderation/ModerationAction"
);

class KickCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("kick")
                .setDescription("Kicks a member from the Discord server.")
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.KickMembers
                )
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to kick.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the kick.")
                        .setRequired(false)
                        .setMaxLength(512)
                )
        );

    }

    async execute(interaction) {

        if (!interaction.guild) {
            await interaction.reply({
                content: "This command can only be used in a server.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const moduleManager = Registry.get("modules");
        const moderation = moduleManager.get("Moderation");

        if (!moderation) {
            throw new Error("Moderation Module is not available.");
        }

        const requiredPermission =
            moderation.getRequiredPermission(
                ModerationAction.KICK
            );

        const hasPermission =
            DiscordPermissionService.hasPermission(
                interaction.memberPermissions,
                requiredPermission
            );

        if (!hasPermission) {
            await interaction.reply({
                content:
                    "You do not have permission to kick members.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const targetUser = interaction.options.getUser(
            "member",
            true
        );

        const targetMember =
            await interaction.guild.members.fetch(
                targetUser.id
            );

        const validation =
            await DiscordModerationGuard.validate(
                interaction,
                targetMember,
                "kick"
            );

        if (!validation.allowed) {
            await interaction.reply({
                content: validation.message,
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        if (!targetMember.kickable) {
            await interaction.reply({
                content:
                    "I cannot kick that member. Check my role and permissions.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const reason =
            interaction.options.getString("reason") ||
            `Kicked by ${interaction.user.tag}`;

        await targetMember.kick(reason);

        moderation.recordAction({
            action: ModerationAction.KICK,
            guildId: interaction.guild.id,
            moderatorId: interaction.user.id,
            targetId: targetUser.id,
            reason,
            details: {
                source: "Discord"
            }
        });

        await interaction.reply({
            content:
                `Kicked ${targetUser.tag}. Reason: ${reason}`,
            flags: MessageFlags.Ephemeral
        });

    }

}

module.exports = KickCommand;