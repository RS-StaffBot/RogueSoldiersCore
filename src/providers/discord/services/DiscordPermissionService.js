const {
    PermissionFlagsBits
} = require("discord.js");

const ModerationPermission = require(
    "../../../shared/permissions/ModerationPermission"
);

class DiscordPermissionService {

    constructor() {

        this.permissionMap = new Map([
            [
                ModerationPermission.BAN_MEMBERS,
                PermissionFlagsBits.BanMembers
            ],
            [
                ModerationPermission.KICK_MEMBERS,
                PermissionFlagsBits.KickMembers
            ],
            [
                ModerationPermission.WARN_MEMBERS,
                PermissionFlagsBits.ModerateMembers
            ],
            [
                ModerationPermission.TIMEOUT_MEMBERS,
                PermissionFlagsBits.ModerateMembers
            ],
            [
                ModerationPermission.PURGE_MESSAGES,
                PermissionFlagsBits.ManageMessages
            ]
        ]);

    }

    getDiscordPermission(permission) {

        if (!this.permissionMap.has(permission)) {
            throw new Error(
                `Unsupported framework permission: ${permission}`
            );
        }

        return this.permissionMap.get(permission);

    }

    hasPermission(memberPermissions, permission) {

        if (!memberPermissions) {
            return false;
        }

        const discordPermission = this.getDiscordPermission(
            permission
        );

        return memberPermissions.has(discordPermission);

    }

}

module.exports = new DiscordPermissionService();