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

class WarnCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("warn")
                .setDescription(
                    "Sends an official warning to a Discord member."
                )
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ModerateMembers
                )
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription(
                            "The member to warn."
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription(
                            "The reason for the warning."
                        )
                        .setRequired(true)
                        .setMaxLength(512)
                )
        );

    }

    async execute(interaction) {

        if (!interaction.guild) {
            await interaction.reply({
                content:
                    "This command can only be used in a server.",
                flags: MessageFlags.Ephemeral
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
                ModerationAction.WARN
            );

        const hasPermission =
            DiscordPermissionService.hasPermission(
                interaction.memberPermissions,
                requiredPermission
            );

        if (!hasPermission) {
            await interaction.reply({
                content:
                    "You do not have permission to warn members.",
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
                "warn"
            );

        if (!validation.allowed) {
            await interaction.reply({
                content: validation.message,
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const reason = interaction.options.getString(
            "reason",
            true
        );

        const warningMessage = [
            `You have received an official warning in **${interaction.guild.name}**.`,
            "",
            `**Reason:** ${reason}`,
            `**Moderator:** ${interaction.user.tag}`
        ].join("\n");

         try {
            await targetUser.send({
                content: warningMessage
            });
        } catch {
            await interaction.reply({
                content:
                    `I could not deliver the warning to ${targetUser.tag}. ` +
                    "They may have direct messages disabled.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        moderation.recordAction({
            action: ModerationAction.WARN,
            guildId: interaction.guild.id,
            moderatorId: interaction.user.id,
            targetId: targetUser.id,
            reason,
            details: {
                source: "Discord",
                delivered: true
            }
        });

        await interaction.reply({
            content:
                `Warned ${targetUser.tag}. Reason: ${reason}`,
            flags: MessageFlags.Ephemeral
        });

    }

}

module.exports = WarnCommand;