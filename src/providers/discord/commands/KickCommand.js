const {
    PermissionFlagsBits,
    SlashCommandBuilder
} = require("discord.js");

const Registry = require("../../../core/Registry");
const BaseCommand = require("./BaseCommand");
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
                ephemeral: true
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
                ephemeral: true
            });

            return;

        }

        const targetUser = interaction.options.getUser(
            "member",
            true
        );

        if (targetUser.id === interaction.user.id) {

            await interaction.reply({
                content: "You cannot kick yourself.",
                ephemeral: true
            });

            return;

        }

        const targetMember =
            await interaction.guild.members.fetch(
                targetUser.id
            );

        if (!targetMember.kickable) {

            await interaction.reply({
                content:
                    "I cannot kick that member. Check my role and permissions.",
                ephemeral: true
            });

            return;

        }

        const reason =
            interaction.options.getString("reason") ||
            `Kicked by ${interaction.user.tag}`;

        await targetMember.kick(reason);

        await interaction.reply({
            content:
                `Kicked ${targetUser.tag}. Reason: ${reason}`,
            ephemeral: true
        });

    }

}

module.exports = KickCommand;