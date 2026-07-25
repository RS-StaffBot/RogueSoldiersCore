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

class TimeoutCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("timeout")
                .setDescription(
                    "Temporarily prevents a member from interacting."
                )
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ModerateMembers
                )
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to time out.")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("minutes")
                        .setDescription(
                            "Timeout duration in minutes."
                        )
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(40320)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription(
                            "The reason for the timeout."
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
                    "You do not have permission to time out members.",
                ephemeral: true
            });

            return;
        }

        const targetUser = interaction.options.getUser(
            "member",
            true
        );

        const durationMinutes =
            interaction.options.getInteger(
                "minutes",
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
                "timeout"
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
                    "I cannot time out that member. Check my role and permissions.",
                ephemeral: true
            });

            return;
        }

        const reason =
            interaction.options.getString("reason") ||
            `Timed out by ${interaction.user.tag}`;

        const durationMilliseconds =
            durationMinutes * 60 * 1000;

        await targetMember.timeout(
            durationMilliseconds,
            reason
        );

        await interaction.reply({
            content:
                `Timed out ${targetUser.tag} for ` +
                `${durationMinutes} minute(s). Reason: ${reason}`,
            ephemeral: true
        });

    }

}

module.exports = TimeoutCommand;