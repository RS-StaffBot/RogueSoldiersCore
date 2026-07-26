class FakeWebsiteOAuthFlow {

    constructor({
        beginLogin = null,
        callbackResult = null,
        completeCallback = null,
        loginResult = null,
        logout = null,
        logoutResult = null
    } = {}) {

        this.beginLoginImplementation = beginLogin;
        this.completeCallbackImplementation =
            completeCallback;
        this.logoutImplementation = logout;
        this.callbackResult =
            callbackResult ?? this.createResult(303);
        this.loginResult =
            loginResult ?? this.createResult(303);
        this.logoutResult =
            logoutResult ?? this.createResult(204);
        this.callbackCalls = [];
        this.loginCount = 0;
        this.logoutCalls = [];
        this.shutdownCount = 0;

    }

    beginLogin() {
        this.loginCount += 1;

        if (this.beginLoginImplementation) {
            return this.beginLoginImplementation();
        }

        return this.loginResult;
    }

    async completeCallback(options) {
        this.callbackCalls.push(options);

        if (this.completeCallbackImplementation) {
            return this
                .completeCallbackImplementation(options);
        }

        return this.callbackResult;
    }

    logout(request, publicOrigin) {
        this.logoutCalls.push({
            publicOrigin,
            request
        });

        if (this.logoutImplementation) {
            return this.logoutImplementation(
                request,
                publicOrigin
            );
        }

        return this.logoutResult;
    }

    beginShutdown() {
        this.shutdownCount += 1;
    }

    createResult(statusCode, {
        cookies = [],
        location = null
    } = {}) {
        return {
            cookies,
            location,
            statusCode
        };
    }

}

module.exports = FakeWebsiteOAuthFlow;
