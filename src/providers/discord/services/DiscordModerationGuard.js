class DiscordModerationGuard {

    getActionLanguage(action) {

        const actionLanguage = {
            ban: {
                base: "ban",
                past: "banned"
            },
            kick: {
                base: "kick",
                past: "kicked"
            },
            timeout: {
                base: "time out",
                past: "timed out"
            },
            untimeout: {
                base: "remove the timeout from",
                past: "had their timeout removed"
            }
        };

        return actionLanguage[action] || {
            base: action,
            past: `${action}ed`
        };

    }

    async validate(interaction, targetMember, action) {

        const language = this.getActionLanguage(action);

        if (targetMember.id === interaction.user.id) {
            return {
                allowed: false,
                message:
                    `You cannot ${language.base} yourself.`
            };
        }

        if (targetMember.id === interaction.guild.ownerId) {
            return {
                allowed: false,
                message:
                    `The server owner cannot be ${language.past}.`
            };
        }

        const moderatorMember =
            await interaction.guild.members.fetch(
                interaction.user.id
            );

        const moderatorIsOwner =
            moderatorMember.id === interaction.guild.ownerId;

        const moderatorIsAboveTarget =
            moderatorMember.roles.highest.comparePositionTo(
                targetMember.roles.highest
            ) > 0;

        if (
            !moderatorIsOwner &&
            !moderatorIsAboveTarget
        ) {
            return {
                allowed: false,
                message:
                    `You cannot ${language.base} a member ` +
                    "with an equal or higher role."
            };
        }

        const botMember =
            interaction.guild.members.me ||
            await interaction.guild.members.fetchMe();

        const botIsAboveTarget =
            botMember.roles.highest.comparePositionTo(
                targetMember.roles.highest
            ) > 0;

        if (!botIsAboveTarget) {
            return {
                allowed: false,
                message:
                    `I cannot ${language.base} that member ` +
                    "because their role is equal to or higher than mine."
            };
        }

        return {
            allowed: true,
            message: null
        };

    }

}

module.exports = new DiscordModerationGuard();