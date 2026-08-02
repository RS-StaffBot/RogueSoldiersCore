const PermissionIdentifier = Object.freeze({
    create(value) {
        if (!value || typeof value !== "string") {
            throw new Error("Permission identifier value must be a non-empty string.");
        }

        return value;
    }
});

module.exports = PermissionIdentifier;
