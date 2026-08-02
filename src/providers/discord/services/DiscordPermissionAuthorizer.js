class DiscordPermissionAuthorizer {

    constructor({
        requiredPermission
    } = {}) {

        if (typeof requiredPermission !== "bigint") {
            throw new Error(
                "Discord required permission must be a bigint."
            );
        }

        this.requiredPermission = requiredPermission;

        Object.freeze(this);

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
                "Discord member permissions are required."
            );
        }

        return memberPermissions.has(
            this.requiredPermission
        ) === true;

    }

}

module.exports = DiscordPermissionAuthorizer;