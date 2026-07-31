const CHAT_PATTERN = new RegExp(
    "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\s+" +
    "\\S+\\s+INF Chat \\(from '" +
    "(Steam_[A-Za-z0-9]+|EOS_[A-Za-z0-9]+)', " +
    "entity id '\\d+', to 'Global'\\): '[^']*': " +
    "([A-Za-z0-9_-]{16,128})$",
    "u"
);

class SevenDaysToDieIdentityProofChatParser {

    parse(line, {
        challenge,
        observedAt
    } = {}) {

        this.validateLine(line);
        this.validateChallenge(challenge);
        this.validateObservedAt(observedAt);

        const match = CHAT_PATTERN.exec(line);

        if (!match || match[2] !== challenge) {
            return null;
        }

        return Object.freeze({
            gameUserId: match[1],
            challenge,
            observedAt
        });

    }

    validateLine(line) {

        if (typeof line !== "string") {
            throw new Error(
                "7 Days to Die identity proof chat line must be a string."
            );
        }

    }

    validateChallenge(challenge) {

        if (
            typeof challenge !== "string" ||
            challenge.length < 16 ||
            challenge.length > 128 ||
            !/^[A-Za-z0-9_-]+$/u.test(challenge)
        ) {
            throw new Error(
                "A valid identity proof challenge is required."
            );
        }

    }

    validateObservedAt(observedAt) {

        if (!Number.isSafeInteger(observedAt) || observedAt <= 0) {
            throw new Error(
                "A valid identity proof observation time is required."
            );
        }

    }

}

module.exports = SevenDaysToDieIdentityProofChatParser;
