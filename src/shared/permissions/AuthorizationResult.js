class AuthorizationResult {
    constructor({ authorized, reason = null } = {}) {
        this.authorized = Boolean(authorized);
        this.reason = reason;

        Object.freeze(this);
    }

    static allow() {
        return new AuthorizationResult({ authorized: true });
    }

    static deny(reason) {
        return new AuthorizationResult({
            authorized: false,
            reason
        });
    }
}

module.exports = AuthorizationResult;
