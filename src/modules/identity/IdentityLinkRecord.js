const IdentityLinkContract = require(
    "./IdentityLinkContract"
);
const IdentityLinkStatus = require(
    "./IdentityLinkStatus"
);

class IdentityLinkRecord {

    constructor({
        id,
        discordUserId,
        gameUserId,
        status = IdentityLinkStatus.PENDING,
        createdAt = new Date(),
        verifiedAt = null,
        revokedAt = null
    } = {}) {

        this.validateRequiredString(id, "Identity link ID");
        this.validateRequiredString(
            discordUserId,
            "Discord user ID"
        );
        this.validateGameUserId(gameUserId);

        if (
            !Object.values(IdentityLinkStatus)
                .includes(status)
        ) {
            throw new Error(
                "Unsupported identity link status: " +
                String(status)
            );
        }

        this.validateDate(createdAt, "creation", false);
        this.validateDate(verifiedAt, "verification", true);
        this.validateDate(revokedAt, "revocation", true);
        this.validateStatusDates(
            status,
            verifiedAt,
            revokedAt
        );

        this.id = id;
        this.discordUserId = discordUserId;
        this.gameUserId = gameUserId;
        this.status = status;
        this.createdAt = createdAt.toISOString();
        this.verifiedAt = verifiedAt
            ? verifiedAt.toISOString()
            : null;
        this.revokedAt = revokedAt
            ? revokedAt.toISOString()
            : null;

        Object.freeze(this);

    }

    validateRequiredString(value, name) {

        if (
            typeof value !== "string" ||
            value.trim().length === 0 ||
            value !== value.trim()
        ) {
            throw new Error(`${name} is required.`);
        }

    }

    validateGameUserId(gameUserId) {

        this.validateRequiredString(
            gameUserId,
            "Game user ID"
        );

        if (
            !IdentityLinkContract
                .supportedGameIdentityPrefixes
                .some(prefix => gameUserId.startsWith(prefix))
        ) {
            throw new Error(
                "Game user ID must use a supported durable prefix."
            );
        }

        if (
            gameUserId.includes("\r") ||
            gameUserId.includes("\n") ||
            /\s/.test(gameUserId)
        ) {
            throw new Error(
                "Game user ID must be one safe token."
            );
        }

    }

    validateDate(value, name, nullable) {

        if (nullable && value === null) {
            return;
        }

        if (
            !(value instanceof Date) ||
            Number.isNaN(value.getTime())
        ) {
            throw new Error(
                `Identity link ${name} date is invalid.`
            );
        }

    }

    validateStatusDates(status, verifiedAt, revokedAt) {

        if (
            status === IdentityLinkStatus.PENDING &&
            (verifiedAt !== null || revokedAt !== null)
        ) {
            throw new Error(
                "Pending identity links cannot have terminal dates."
            );
        }

        if (
            status === IdentityLinkStatus.VERIFIED &&
            (verifiedAt === null || revokedAt !== null)
        ) {
            throw new Error(
                "Verified identity links require only a verification date."
            );
        }

        if (
            status === IdentityLinkStatus.REVOKED &&
            revokedAt === null
        ) {
            throw new Error(
                "Revoked identity links require a revocation date."
            );
        }

    }

}

module.exports = IdentityLinkRecord;
