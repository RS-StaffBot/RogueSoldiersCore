const {
    PermissionFlagsBits
} = require("discord.js");

class DiscordGameCommandAuthorizer {

    constructor({
        requiredPermission = PermissionFlagsBits.ManageGuild
    } = {}) {

        if (typeof requiredPermission !== "bigint") {
            throw new Error(
                "Discord game command permission must be a bigint."
            );
        }

        this.requiredPermission = requiredPermission;

    }

    getRequiredPermission() {
        return this.requiredPermission;
    }

    isAuthorized(memberPermissions) {

        if (
            !memberPermissions ||
            typeof memberPermissions !== "object" ||
            typeof memberPermissions.has !== "function"
        ) {
            throw new Error(
                "Discord member permissions are required for game commands."
            );
        }

        return memberPermissions.has(
            this.requiredPermission
        ) === true;

    }

}

module.exports = DiscordGameCommandAuthorizer;
