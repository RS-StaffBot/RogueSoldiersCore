class ConfigurationRedactor {

    constructor({
        redactedValue = "[REDACTED]",
        secretKeyPattern = /(token|password|secret|api[_-]?key|credential)/i
    } = {}) {

        if (typeof redactedValue !== "string") {
            throw new Error("Configuration redacted value is invalid.");
        }

        if (!(secretKeyPattern instanceof RegExp)) {
            throw new Error("Configuration secret key pattern is invalid.");
        }

        this.redactedValue = redactedValue;
        this.secretKeyPattern = secretKeyPattern;

    }

    redact(value, knownSecrets = []) {

        if (!Array.isArray(knownSecrets)) {
            throw new Error("Known configuration secrets must be an array.");
        }

        const secretValues = knownSecrets.filter(
            secret => typeof secret === "string" && secret.length > 0
        );

        return this.redactValue(value, secretValues, new WeakMap());

    }

    redactValue(value, secretValues, seen) {

        if (typeof value === "string") {
            let redacted = value;

            for (const secret of secretValues) {
                redacted = redacted.split(secret).join(this.redactedValue);
            }

            return redacted;
        }

        if (value === null || typeof value !== "object") {
            return value;
        }

        if (seen.has(value)) {
            return seen.get(value);
        }

        if (Array.isArray(value)) {
            const result = [];
            seen.set(value, result);

            for (const entry of value) {
                result.push(this.redactValue(entry, secretValues, seen));
            }

            return result;
        }

        const result = {};
        seen.set(value, result);

        for (const [key, entry] of Object.entries(value)) {
            result[key] = this.secretKeyPattern.test(key)
                ? this.redactedValue
                : this.redactValue(entry, secretValues, seen);
        }

        return result;

    }

}

module.exports = ConfigurationRedactor;
