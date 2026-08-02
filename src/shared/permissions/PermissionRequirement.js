class PermissionRequirement {
    constructor(permission) {
        if (!permission || typeof permission !== "string") {
            throw new Error("Permission requirement must contain a valid permission identifier.");
        }

        this.permission = permission;
        Object.freeze(this);
    }
}

module.exports = PermissionRequirement;
