class FakeWebsiteAuthenticator {

    constructor({
        authenticate = null,
        identity = null
    } = {}) {

        this.authenticateImplementation = authenticate;
        this.identity = identity;
        this.authenticateCalls = [];

    }

    async authenticate(request) {

        this.authenticateCalls.push(request);

        if (this.authenticateImplementation) {
            return this.authenticateImplementation(request);
        }

        if (this.identity === null) {
            return null;
        }

        return {
            ...this.identity,
            permissions:
                Array.isArray(this.identity.permissions)
                    ? [...this.identity.permissions]
                    : this.identity.permissions
        };

    }

}

module.exports = FakeWebsiteAuthenticator;
