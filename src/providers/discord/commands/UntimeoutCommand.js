const {
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

class UntimeoutCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("untimeout")
                .setDescription("Removes a member's active timeout.")
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ModerateMembers
                )
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription(
                            "The member whose timeout will be removed."
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription(
                            "The reason for removing the timeout."
                        )
                        .setRequired(false)
                        .setMaxLength(512)
                )
        );

    }

    async execute(interaction) {

        if (!interaction.guild) {
            await interaction.reply({
                content:
                    "This command can only be used in a server.",
                ephemeral: true
            });

            return;
        }

        const moduleManager = Registry.get("modules");
        const moderation = moduleManager.get("Moderation");

        if (!moderation) {
            throw new Error(
                "Moderation Module is not available."
            );
        }

        const requiredPermission =
            moderation.getRequiredPermission(
                ModerationAction.TIMEOUT
            );

        const hasPermission =
            DiscordPermissionService.hasPermission(
                interaction.memberPermissions,
                requiredPermission
            );

        if (!hasPermission) {
            await interaction.reply({
                content:
                    "You do not have permission to remove timeouts.",
                ephemeral: true
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
                "untimeout"
            );

        if (!validation.allowed) {
            await interaction.reply({
                content: validation.message,
                ephemeral: true
            });

            return;
        }

        if (!targetMember.moderatable) {
            await interaction.reply({
                content:
                    "I cannot remove that member's timeout. " +
                    "Check my role and permissions.",
                ephemeral: true
            });

            return;
        }

        if (!targetMember.isCommunicationDisabled()) {
            await interaction.reply({
                content:
                    `${targetUser.tag} is not currently timed out.`,
                ephemeral: true
            });

            return;
        }

        const reason =
            interaction.options.getString("reason") ||
            `Timeout removed by ${interaction.user.tag}`;

        await targetMember.timeout(null, reason);

        await interaction.reply({
            content:
                `Removed the timeout from ${targetUser.tag}. ` +
                `Reason: ${reason}`,
            ephemeral: true
        });

    }

}

module.exports = UntimeoutCommand;