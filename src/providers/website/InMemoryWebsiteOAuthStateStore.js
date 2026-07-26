const {
    createHash,
    timingSafeEqual
} = require("node:crypto");

const DEFAULT_MAXIMUM_ATTEMPTS = 1024;

class InMemoryWebsiteOAuthStateStore {

    constructor({
        clock = Date.now,
        lifetimeMs,
        maximumAttempts = DEFAULT_MAXIMUM_ATTEMPTS
    } = {}) {

        if (typeof clock !== "function") {
            throw new Error(
                "Website OAuth state clock must be a function."
            );
        }

        if (
            !Number.isSafeInteger(lifetimeMs) ||
            lifetimeMs < 1
        ) {
            throw new Error(
                "Website OAuth state lifetime must be a positive safe integer."
            );
        }

        if (
            !Number.isSafeInteger(maximumAttempts) ||
            maximumAttempts < 1
        ) {
            throw new Error(
                "Website OAuth state capacity must be a positive safe integer."
            );
        }

        this.clock = clock;
        this.lifetimeMs = lifetimeMs;
        this.maximumAttempts = maximumAttempts;
        this.attempts = new Map();

    }

    save({
        state,
        browserBinding,
        codeVerifier
    } = {}) {

        this.validateSecret(state, "OAuth state");
        this.validateSecret(
            browserBinding,
            "OAuth browser binding"
        );
        this.validateSecret(
            codeVerifier,
            "OAuth PKCE verifier"
        );

        const now = this.getNow();

        this.removeExpired(now);

        if (this.attempts.size >= this.maximumAttempts) {
            throw new Error(
                "Website OAuth state capacity is exhausted."
            );
        }

        const stateDigest = this.createDigest(state);
        const stateKey = stateDigest.toString("hex");

        if (this.attempts.has(stateKey)) {
            throw new Error(
                "Website OAuth state already exists."
            );
        }

        const record = Object.freeze({
            browserBindingDigest:
                this.createDigest(browserBinding),
            codeVerifier,
            createdAt: now,
            expiresAt: now + this.lifetimeMs
        });

        this.attempts.set(stateKey, record);

        return Object.freeze({
            createdAt: record.createdAt,
            expiresAt: record.expiresAt
        });

    }

    consume(state, browserBinding) {

        if (
            typeof state !== "string" ||
            state.length === 0 ||
            typeof browserBinding !== "string" ||
            browserBinding.length === 0
        ) {
            return null;
        }

        const now = this.getNow();

        this.removeExpired(now);

        const stateKey =
            this.createDigest(state).toString("hex");
        const record = this.attempts.get(stateKey);

        if (!record) {
            return null;
        }

        const receivedBindingDigest =
            this.createDigest(browserBinding);

        if (
            !timingSafeEqual(
                record.browserBindingDigest,
                receivedBindingDigest
            )
        ) {
            return null;
        }

        this.attempts.delete(stateKey);

        return Object.freeze({
            codeVerifier: record.codeVerifier,
            createdAt: record.createdAt,
            expiresAt: record.expiresAt
        });

    }

    clear() {
        this.attempts.clear();
    }

    count() {
        this.removeExpired(this.getNow());

        return this.attempts.size;
    }

    removeExpired(now) {

        for (const [key, attempt] of this.attempts) {

            if (now >= attempt.expiresAt) {
                this.attempts.delete(key);
            }

        }

    }

    getNow() {

        const now = this.clock();

        if (!Number.isSafeInteger(now) || now < 0) {
            throw new Error(
                "Website OAuth state clock returned an invalid value."
            );
        }

        return now;

    }

    validateSecret(value, name) {

        if (
            typeof value !== "string" ||
            value.length === 0
        ) {
            throw new Error(`${name} is required.`);
        }

    }

    createDigest(value) {
        return createHash("sha256")
            .update(value, "utf8")
            .digest();
    }

}

module.exports = InMemoryWebsiteOAuthStateStore;
