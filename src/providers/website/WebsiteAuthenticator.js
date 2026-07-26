class WebsiteAuthenticator {

    constructor({
        cookieService = null,
        sessionStore = null
    } = {}) {

        if (
            (cookieService === null) !==
            (sessionStore === null)
        ) {
            throw new Error(
                "Website session authentication boundaries must be provided together."
            );
        }

        if (
            cookieService !== null &&
            typeof cookieService.readSessionCookie !==
                "function"
        ) {
            throw new Error(
                "Website cookie service boundary is invalid."
            );
        }

        if (
            sessionStore !== null &&
            typeof sessionStore.resolve !== "function"
        ) {
            throw new Error(
                "Website session store boundary is invalid."
            );
        }

        this.cookieService = cookieService;
        this.sessionStore = sessionStore;

    }

    async authenticate(request) {

        if (this.sessionStore === null) {
            return this.createResult(null, false);
        }

        const cookie =
            this.cookieService.readSessionCookie(request);

        if (!cookie.present) {
            return this.createResult(null, false);
        }

        if (!cookie.valid || cookie.token === null) {
            return this.createResult(null, true);
        }

        const identity =
            this.sessionStore.resolve(cookie.token);

        return this.createResult(
            identity,
            identity === null
        );

    }

    createResult(identity, clearSessionCookie) {
        return Object.freeze({
            clearSessionCookie,
            identity
        });
    }

}

module.exports = WebsiteAuthenticator;
