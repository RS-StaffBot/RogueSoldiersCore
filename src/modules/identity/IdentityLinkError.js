class IdentityLinkError extends Error {

    constructor(code, message) {

        super(message);

        if (
            typeof code !== "string" ||
            code.trim().length === 0
        ) {
            throw new Error(
                "Identity link error code is required."
            );
        }

        this.name = "IdentityLinkError";
        this.code = code;

        Object.freeze(this);

    }

}

IdentityLinkError.Code = Object.freeze({
    DISCORD_CONFLICT: "DISCORD_CONFLICT",
    GAME_CONFLICT: "GAME_CONFLICT",
    STALE_STATE: "STALE_STATE",
    NOT_FOUND: "NOT_FOUND"
});

module.exports = IdentityLinkError;
