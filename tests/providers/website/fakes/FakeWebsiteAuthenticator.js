class FakeWebsiteAuthenticator {

    constructor({
        authenticate = null,
        clearSessionCookie = false,
        identity = null
    } = {}) {

        this.authenticateImplementation = authenticate;
        this.clearSessionCookie = clearSessionCookie;
        this.identity = identity;
        this.authenticateCalls = [];

    }

    async authenticate(request) {

        this.authenticateCalls.push(request);

        if (this.authenticateImplementation) {
            return this.authenticateImplementation(request);
        }

        return {
            clearSessionCookie:
                this.clearSessionCookie,
            identity:
                this.identity === null
                    ? null
                    : {
                        ...this.identity,
                        permissions:
                            Array.isArray(
                                this.identity.permissions
                            )
                                ? [
                                    ...this.identity.permissions
                                ]
                                : this.identity.permissions
                    }
        };

    }

}

module.exports = FakeWebsiteAuthenticator;
