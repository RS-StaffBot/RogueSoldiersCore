const SESSION_COOKIE_NAME = "__Host-rsf_session";
const OAUTH_BINDING_COOKIE_NAME =
    "__Secure-rsf_oauth_binding";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

class WebsiteCookieService {

    constructor({
        oauthStateLifetimeMs,
        sessionAbsoluteLifetimeMs
    } = {}) {

        this.oauthMaxAge = this.toMaxAge(
            oauthStateLifetimeMs,
            "OAuth state"
        );
        this.sessionMaxAge = this.toMaxAge(
            sessionAbsoluteLifetimeMs,
            "session absolute"
        );

    }

    readSessionCookie(request) {
        return this.readCookie(
            request,
            SESSION_COOKIE_NAME
        );
    }

    readOAuthBindingCookie(request) {
        return this.readCookie(
            request,
            OAUTH_BINDING_COOKIE_NAME
        );
    }

    createSessionCookie(token) {
        return this.serializeCookie(
            SESSION_COOKIE_NAME,
            this.validateToken(token),
            "/",
            this.sessionMaxAge
        );
    }

    clearSessionCookie() {
        return this.serializeCookie(
            SESSION_COOKIE_NAME,
            "",
            "/",
            0
        );
    }

    createOAuthBindingCookie(token) {
        return this.serializeCookie(
            OAUTH_BINDING_COOKIE_NAME,
            this.validateToken(token),
            "/auth/discord/callback",
            this.oauthMaxAge
        );
    }

    clearOAuthBindingCookie() {
        return this.serializeCookie(
            OAUTH_BINDING_COOKIE_NAME,
            "",
            "/auth/discord/callback",
            0
        );
    }

    readCookie(request, expectedName) {

        const header = request?.headers?.cookie;

        if (header === undefined) {
            return Object.freeze({
                present: false,
                token: null,
                valid: true
            });
        }

        if (typeof header !== "string") {
            return Object.freeze({
                present: true,
                token: null,
                valid: false
            });
        }

        const values = [];

        for (const part of header.split(";")) {

            const separatorIndex = part.indexOf("=");

            if (separatorIndex < 1) {
                continue;
            }

            const name = part
                .slice(0, separatorIndex)
                .trim();

            if (name !== expectedName) {
                continue;
            }

            values.push(
                part.slice(separatorIndex + 1).trim()
            );

        }

        if (values.length === 0) {
            return Object.freeze({
                present: false,
                token: null,
                valid: true
            });
        }

        if (
            values.length !== 1 ||
            !TOKEN_PATTERN.test(values[0])
        ) {
            return Object.freeze({
                present: true,
                token: null,
                valid: false
            });
        }

        return Object.freeze({
            present: true,
            token: values[0],
            valid: true
        });

    }

    serializeCookie(name, value, path, maxAge) {
        return (
            `${name}=${value}; Max-Age=${maxAge}; ` +
            `Path=${path}; Secure; HttpOnly; SameSite=Lax`
        );
    }

    validateToken(token) {

        if (
            typeof token !== "string" ||
            !TOKEN_PATTERN.test(token)
        ) {
            throw new Error(
                "Website cookie token is invalid."
            );
        }

        return token;

    }

    toMaxAge(lifetimeMs, name) {

        if (
            !Number.isSafeInteger(lifetimeMs) ||
            lifetimeMs < 1000
        ) {
            throw new Error(
                `Website ${name} lifetime must be at least one second.`
            );
        }

        return Math.floor(lifetimeMs / 1000);

    }

}

module.exports = WebsiteCookieService;
