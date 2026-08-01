class SevenDaysToDieReconnectPolicy {

    constructor({
        delayMs,
        enabled,
        maximumAttempts,
        wait = milliseconds => new Promise(
            resolve => setTimeout(resolve, milliseconds)
        )
    } = {}) {

        if (typeof enabled !== "boolean") {
            throw new Error(
                "7 Days to Die reconnect enabled must be a boolean."
            );
        }

        if (
            enabled &&
            (
                !Number.isSafeInteger(maximumAttempts) ||
                maximumAttempts < 1 ||
                maximumAttempts > 10 ||
                !Number.isSafeInteger(delayMs) ||
                delayMs < 100 ||
                delayMs > 300000
            )
        ) {
            throw new Error(
                "7 Days to Die reconnect policy values are invalid."
            );
        }

        if (typeof wait !== "function") {
            throw new Error(
                "7 Days to Die reconnect wait operation is invalid."
            );
        }

        this.delayMs = enabled ? delayMs : 0;
        this.enabled = enabled;
        this.maximumAttempts = enabled ? maximumAttempts : 0;
        this.wait = wait;
        this.active = false;
        this.cancelled = false;

    }

    isActive() {
        return this.active;
    }

    cancel() {
        this.cancelled = true;
    }

    async run(connect) {

        if (!this.enabled) {
            return this.createResult("DISABLED", 0);
        }

        if (this.active) {
            return this.createResult("BUSY", 0);
        }

        if (typeof connect !== "function") {
            throw new Error(
                "7 Days to Die reconnect operation is required."
            );
        }

        this.active = true;
        this.cancelled = false;
        let attempts = 0;

        try {

            while (attempts < this.maximumAttempts) {

                await this.wait(this.delayMs);

                if (this.cancelled) {
                    return this.createResult("CANCELLED", attempts);
                }

                attempts += 1;

                try {
                    await connect();
                    return this.createResult("RECOVERED", attempts);
                } catch {
                    // A failed attempt is intentionally sanitized.
                }

            }

            return this.createResult("EXHAUSTED", attempts);

        } finally {
            this.active = false;
        }

    }

    createResult(outcome, attempts) {
        return Object.freeze({
            attempts,
            outcome,
            recovered: outcome === "RECOVERED"
        });
    }

}

module.exports = SevenDaysToDieReconnectPolicy;
