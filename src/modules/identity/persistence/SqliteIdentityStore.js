const IdentityLinkError = require(
    "../IdentityLinkError"
);
const IdentityLinkStatus = require(
    "../IdentityLinkStatus"
);

class SqliteIdentityStore {

    #database;
    #insertLink;
    #selectBySequence;
    #selectActiveByDiscord;
    #selectActiveByGame;
    #revokeExpected;
    #listLinks;

    constructor(database) {

        if (!database) {
            throw new Error(
                "A database connection is required for " +
                "Identity persistence."
            );
        }

        this.#database = database;
        this.#insertLink = database.prepare(`
            INSERT INTO identity_links (
                discord_user_id,
                game_user_id,
                status,
                created_at,
                verified_at,
                revoked_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        this.#selectBySequence = database.prepare(`
            SELECT
                sequence,
                discord_user_id AS discordUserId,
                game_user_id AS gameUserId,
                status,
                created_at AS createdAt,
                verified_at AS verifiedAt,
                revoked_at AS revokedAt
            FROM identity_links
            WHERE sequence = ?
        `);
        this.#selectActiveByDiscord = database.prepare(`
            SELECT
                sequence,
                discord_user_id AS discordUserId,
                game_user_id AS gameUserId,
                status,
                created_at AS createdAt,
                verified_at AS verifiedAt,
                revoked_at AS revokedAt
            FROM identity_links
            WHERE
                discord_user_id = ? AND
                status != 'REVOKED'
        `);
        this.#selectActiveByGame = database.prepare(`
            SELECT
                sequence,
                discord_user_id AS discordUserId,
                game_user_id AS gameUserId,
                status,
                created_at AS createdAt,
                verified_at AS verifiedAt,
                revoked_at AS revokedAt
            FROM identity_links
            WHERE
                game_user_id = ? AND
                status != 'REVOKED'
        `);
        this.#revokeExpected = database.prepare(`
            UPDATE identity_links
            SET
                status = ?,
                verified_at = ?,
                revoked_at = ?
            WHERE
                sequence = ? AND
                discord_user_id = ? AND
                game_user_id = ? AND
                status = ? AND
                created_at = ? AND
                verified_at IS ? AND
                revoked_at IS ?
        `);
        this.#listLinks = database.prepare(`
            SELECT
                sequence,
                discord_user_id AS discordUserId,
                game_user_id AS gameUserId,
                status,
                created_at AS createdAt,
                verified_at AS verifiedAt,
                revoked_at AS revokedAt
            FROM identity_links
            ORDER BY sequence ASC
        `);

    }

    createLink(link) {

        return this.runTransaction(() =>
            this.insertLink(link)
        );

    }

    getLinkById(linkId) {

        const sequence = this.parseLinkSequence(linkId);

        if (sequence === null) {
            return null;
        }

        const row = this.#selectBySequence.get(sequence);

        return row ? this.mapLink(row) : null;

    }

    getActiveLinkByDiscordUserId(discordUserId) {

        const row = this.#selectActiveByDiscord.get(
            discordUserId
        );

        return row ? this.mapLink(row) : null;

    }

    getActiveLinkByGameUserId(gameUserId) {

        const row = this.#selectActiveByGame.get(gameUserId);

        return row ? this.mapLink(row) : null;

    }

    replaceLink(expectedLink, revokedLink, pendingLink) {

        const sequence = this.requireLinkSequence(
            expectedLink.id
        );

        if (
            revokedLink.id !== expectedLink.id ||
            revokedLink.status !== IdentityLinkStatus.REVOKED
        ) {
            throw new Error(
                "Identity replacement must revoke the current link."
            );
        }

        if (pendingLink.status !== IdentityLinkStatus.PENDING) {
            throw new Error(
                "Identity replacement must create a pending link."
            );
        }

        return this.runTransaction(() => {

            const result = this.#revokeExpected.run(
                revokedLink.status,
                revokedLink.verifiedAt,
                revokedLink.revokedAt,
                sequence,
                expectedLink.discordUserId,
                expectedLink.gameUserId,
                expectedLink.status,
                expectedLink.createdAt,
                expectedLink.verifiedAt,
                expectedLink.revokedAt
            );

            if (result.changes !== 1) {
                throw new IdentityLinkError(
                    IdentityLinkError.Code.STALE_STATE,
                    "Identity link state changed; retry the operation."
                );
            }

            return this.insertLink(pendingLink);

        });

    }

    listLinks() {
        return this.#listLinks.all().map(
            row => this.mapLink(row)
        );
    }

    insertLink(link) {

        try {

            const result = this.#insertLink.run(
                link.discordUserId,
                link.gameUserId,
                link.status,
                link.createdAt,
                link.verifiedAt,
                link.revokedAt
            );
            const sequence = this.validateSequence(
                result.lastInsertRowid
            );

            return this.mapLink(
                this.#selectBySequence.get(sequence)
            );

        } catch (error) {

            const discordConflict =
                this.getActiveLinkByDiscordUserId(
                    link.discordUserId
                );
            const gameConflict =
                this.getActiveLinkByGameUserId(
                    link.gameUserId
                );

            if (discordConflict) {
                throw new IdentityLinkError(
                    IdentityLinkError.Code.DISCORD_CONFLICT,
                    "Discord member already has an active " +
                        "identity link."
                );
            }

            if (gameConflict) {
                throw new IdentityLinkError(
                    IdentityLinkError.Code.GAME_CONFLICT,
                    "Game identity already has an active " +
                        "identity link."
                );
            }

            throw error;

        }

    }

    requireLinkSequence(linkId) {

        const sequence = this.parseLinkSequence(linkId);

        if (sequence === null) {
            throw new IdentityLinkError(
                IdentityLinkError.Code.NOT_FOUND,
                "Identity link was not found."
            );
        }

        return sequence;

    }

    parseLinkSequence(linkId) {

        if (typeof linkId !== "string") {
            return null;
        }

        const match = /^identity-link-([1-9]\d*)$/.exec(linkId);

        if (!match) {
            return null;
        }

        const sequence = Number(match[1]);

        return Number.isSafeInteger(sequence)
            ? sequence
            : null;

    }

    validateSequence(value) {

        const sequence = Number(value);

        if (
            !Number.isSafeInteger(sequence) ||
            sequence <= 0 ||
            sequence >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                "Identity link ID sequence reached its safe limit."
            );
        }

        return sequence;

    }

    mapLink(row) {

        const sequence = this.validateSequence(row.sequence);

        return {
            id: `identity-link-${sequence}`,
            discordUserId: row.discordUserId,
            gameUserId: row.gameUserId,
            status: row.status,
            createdAt: row.createdAt,
            verifiedAt: row.verifiedAt,
            revokedAt: row.revokedAt
        };

    }

    runTransaction(operation) {

        this.#database.exec("BEGIN IMMEDIATE");

        try {

            const result = operation();

            this.#database.exec("COMMIT");

            return result;

        } catch (error) {

            try {
                this.#database.exec("ROLLBACK");
            } catch (rollbackError) {
                throw new Error(
                    "Identity storage rollback failed."
                );
            }

            if (error instanceof IdentityLinkError) {
                throw error;
            }

            if (
                error.message.startsWith("Identity ")
            ) {
                throw error;
            }

            throw new Error("Identity storage failed.");

        }

    }

}

module.exports = SqliteIdentityStore;
