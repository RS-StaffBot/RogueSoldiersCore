const IdentityLinkError = require(
    "../IdentityLinkError"
);
const IdentityLinkStatus = require(
    "../IdentityLinkStatus"
);

class InMemoryIdentityStore {

    constructor() {
        this.links = new Map();
        this.nextSequence = 1;
    }

    createLink(link) {

        this.requireAvailableActiveIdentity(link);
        this.validateSequence(this.nextSequence);

        const storedLink = this.copyLink({
            id: `identity-link-${this.nextSequence}`,
            ...link
        });

        this.links.set(storedLink.id, storedLink);
        this.nextSequence += 1;

        return this.copyLink(storedLink);

    }

    getLinkById(linkId) {

        const link = this.links.get(linkId);

        return link ? this.copyLink(link) : null;

    }

    getActiveLinkByDiscordUserId(discordUserId) {

        const link = [...this.links.values()].find(
            current =>
                current.discordUserId === discordUserId &&
                current.status !== IdentityLinkStatus.REVOKED
        );

        return link ? this.copyLink(link) : null;

    }

    getActiveLinkByGameUserId(gameUserId) {

        const link = [...this.links.values()].find(
            current =>
                current.gameUserId === gameUserId &&
                current.status !== IdentityLinkStatus.REVOKED
        );

        return link ? this.copyLink(link) : null;

    }

    replaceLink(expectedLink, revokedLink, pendingLink) {

        this.requireExpectedLink(expectedLink);

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

        const previousLink = this.links.get(expectedLink.id);
        const previousSequence = this.nextSequence;

        this.links.set(
            revokedLink.id,
            this.copyLink(revokedLink)
        );

        try {
            return this.createLink(pendingLink);
        } catch (error) {
            this.links.set(expectedLink.id, previousLink);
            this.nextSequence = previousSequence;
            throw error;
        }

    }

    listLinks() {
        return [...this.links.values()].map(
            link => this.copyLink(link)
        );
    }

    requireAvailableActiveIdentity(link) {

        if (
            this.getActiveLinkByDiscordUserId(
                link.discordUserId
            )
        ) {
            throw new IdentityLinkError(
                IdentityLinkError.Code.DISCORD_CONFLICT,
                "Discord member already has an active identity link."
            );
        }

        if (this.getActiveLinkByGameUserId(link.gameUserId)) {
            throw new IdentityLinkError(
                IdentityLinkError.Code.GAME_CONFLICT,
                "Game identity already has an active identity link."
            );
        }

    }

    requireExpectedLink(expectedLink) {

        const current = this.links.get(expectedLink.id);

        if (!current) {
            throw new IdentityLinkError(
                IdentityLinkError.Code.NOT_FOUND,
                "Identity link was not found."
            );
        }

        if (
            JSON.stringify(current) !==
            JSON.stringify(this.copyLink(expectedLink))
        ) {
            throw new IdentityLinkError(
                IdentityLinkError.Code.STALE_STATE,
                "Identity link state changed; retry the operation."
            );
        }

    }

    validateSequence(sequence) {

        if (
            !Number.isSafeInteger(sequence) ||
            sequence <= 0 ||
            sequence >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                "Identity link ID sequence reached its safe limit."
            );
        }

    }

    copyLink(link) {
        return {
            id: link.id,
            discordUserId: link.discordUserId,
            gameUserId: link.gameUserId,
            status: link.status,
            createdAt: link.createdAt,
            verifiedAt: link.verifiedAt,
            revokedAt: link.revokedAt
        };
    }

}

module.exports = InMemoryIdentityStore;
