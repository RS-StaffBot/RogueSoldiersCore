class AuthorizationContext {
    constructor({ actorId, provider, metadata = {} } = {}) {
        this.actorId = actorId || null;
        this.provider = provider || null;
        this.metadata = metadata;

        Object.freeze(this);
    }
}

module.exports = AuthorizationContext;
