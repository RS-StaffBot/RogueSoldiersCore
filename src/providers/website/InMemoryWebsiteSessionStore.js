const {
    createHash,
    randomBytes
} = require("node:crypto");

const DEFAULT_MAXIMUM_SESSIONS = 10000;
const SESSION_TOKEN_BYTES = 32;
const MAXIMUM_TOKEN_ATTEMPTS = 5;

class InMemoryWebsiteSessionStore {

    constructor({
        absoluteLifetimeMs,
        clock = Date.now,
        idleLifetimeMs,
        maximumSessions = DEFAULT_MAXIMUM_SESSIONS,
        randomBytesSource = randomBytes
    } = {}) {

        if (typeof clock !== "function") {
            throw new Error(
                "Website session clock must be a function."
            );
        }

        if (typeof randomBytesSource !== "function") {
            throw new Error(
                "Website session random source must be a function."
            );
        }

        this.validateLifetime(
            idleLifetimeMs,
            "idle"
        );
        this.validateLifetime(
            absoluteLifetimeMs,
            "absolute"
        );

        if (absoluteLifetimeMs < idleLifetimeMs) {
            throw new Error(
                "Website session absolute lifetime must be at least " +
                "the idle lifetime."
            );
        }

        if (
            !Number.isSafeInteger(maximumSessions) ||
            maximumSessions < 1
        ) {
            throw new Error(
                "Website session capacity must be a positive safe integer."
            );
        }

        this.absoluteLifetimeMs = absoluteLifetimeMs;
        this.clock = clock;
        this.idleLifetimeMs = idleLifetimeMs;
        this.maximumSessions = maximumSessions;
        this.randomBytesSource = randomBytesSource;
        this.sessions = new Map();

    }

    create(identity) {

        const identitySnapshot =
            this.createIdentitySnapshot(identity);
        const now = this.getNow();

        this.removeExpired(now);

        if (this.sessions.size >= this.maximumSessions) {
            throw new Error(
                "Website session capacity is exhausted."
            );
        }

        let token;
        let tokenKey;

        for (
            let attempt = 0;
            attempt < MAXIMUM_TOKEN_ATTEMPTS;
            attempt += 1
        ) {

            token = this.createToken();
            tokenKey = this.createDigestKey(token);

            if (!this.sessions.has(tokenKey)) {
                break;
            }

            token = null;
            tokenKey = null;

        }

        if (token === null || tokenKey === null) {
            throw new Error(
                "Website session token generation failed."
            );
        }

        this.sessions.set(
            tokenKey,
            Object.freeze({
                createdAt: now,
                identity: identitySnapshot,
                lastActivityAt: now
            })
        );

        return Object.freeze({
            identity:
                this.createIdentitySnapshot(identitySnapshot),
            token
        });

    }

    resolve(token) {

        if (
            typeof token !== "string" ||
            token.length === 0
        ) {
            return null;
        }

        const now = this.getNow();
        const tokenKey = this.createDigestKey(token);
        const session = this.sessions.get(tokenKey);

        if (!session) {
            return null;
        }

        if (this.isExpired(session, now)) {
            this.sessions.delete(tokenKey);

            return null;
        }

        this.sessions.set(
            tokenKey,
            Object.freeze({
                createdAt: session.createdAt,
                identity: session.identity,
                lastActivityAt: now
            })
        );

        return this.createIdentitySnapshot(
            session.identity
        );

    }

    revoke(token) {

        if (
            typeof token !== "string" ||
            token.length === 0
        ) {
            return false;
        }

        return this.sessions.delete(
            this.createDigestKey(token)
        );

    }

    clear() {
        this.sessions.clear();
    }

    count() {
        this.removeExpired(this.getNow());

        return this.sessions.size;
    }

    removeExpired(now) {

        for (const [key, session] of this.sessions) {

            if (this.isExpired(session, now)) {
                this.sessions.delete(key);
            }

        }

    }

    isExpired(session, now) {
        return (
            now - session.lastActivityAt >=
                this.idleLifetimeMs ||
            now - session.createdAt >=
                this.absoluteLifetimeMs
        );
    }

    createToken() {

        const bytes =
            this.randomBytesSource(SESSION_TOKEN_BYTES);

        if (
            !Buffer.isBuffer(bytes) ||
            bytes.length < SESSION_TOKEN_BYTES
        ) {
            throw new Error(
                "Website session random source returned insufficient bytes."
            );
        }

        return bytes
            .subarray(0, SESSION_TOKEN_BYTES)
            .toString("base64url");

    }

    createDigestKey(token) {
        return createHash("sha256")
            .update(token, "utf8")
            .digest("hex");
    }

    createIdentitySnapshot(identity) {

        if (
            !identity ||
            typeof identity !== "object" ||
            Array.isArray(identity) ||
            typeof identity.actorId !== "string" ||
            identity.actorId.trim().length === 0 ||
            typeof identity.displayName !== "string" ||
            identity.displayName.trim().length === 0 ||
            !Array.isArray(identity.permissions)
        ) {
            throw new Error(
                "Website session identity is invalid."
            );
        }

        const permissions = identity.permissions.map(
            permission => {

                if (
                    typeof permission !== "string" ||
                    permission.trim().length === 0
                ) {
                    throw new Error(
                        "Website session identity permission is invalid."
                    );
                }

                return permission.trim();

            }
        );

        return Object.freeze({
            actorId: identity.actorId.trim(),
            displayName: identity.displayName.trim(),
            permissions: Object.freeze(permissions)
        });

    }

    getNow() {

        const now = this.clock();

        if (!Number.isSafeInteger(now) || now < 0) {
            throw new Error(
                "Website session clock returned an invalid value."
            );
        }

        return now;

    }

    validateLifetime(value, name) {

        if (
            !Number.isSafeInteger(value) ||
            value < 1
        ) {
            throw new Error(
                `Website session ${name} lifetime must be a ` +
                "positive safe integer."
            );
        }

    }

}

module.exports = InMemoryWebsiteSessionStore;
