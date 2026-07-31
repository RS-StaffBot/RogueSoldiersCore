const BaseModule = require("../core/BaseModule");
const ComponentState = require("../../core/ComponentState");
const IdentityLinkContract = require("./IdentityLinkContract");
const IdentityLinkRecord = require("./IdentityLinkRecord");
const IdentityLinkStatus = require("./IdentityLinkStatus");
const InMemoryIdentityStore = require(
    "./persistence/InMemoryIdentityStore"
);

class IdentityModule extends BaseModule {

    constructor({
        store = new InMemoryIdentityStore()
    } = {}) {

        super(IdentityLinkContract.moduleName);

        this.validateStore(store);
        this.store = store;

    }

    validateStore(store) {

        const requiredMethods =
            IdentityLinkContract.requiredStoreMethods;

        if (
            !store ||
            requiredMethods.some(
                method => typeof store[method] !== "function"
            )
        ) {
            throw new Error(
                "Identity store does not implement the " +
                "required persistence contract."
            );
        }

    }

    initialize() {

        this.state = ComponentState.INITIALIZING;

        try {
            this.validateDurableState();
        } catch (error) {
            this.state = ComponentState.ERROR;
            throw new Error(
                "Identity durable state is invalid."
            );
        }

        this.state = ComponentState.READY;

    }

    validateDurableState() {

        const links = this.store.listLinks();
        const linkIds = new Set();
        const activeDiscordUserIds = new Set();
        const activeGameUserIds = new Set();

        links.forEach(link => {

            const record = this.createRecord(link);

            if (linkIds.has(record.id)) {
                throw new Error(
                    "Stored Identity link IDs must be unique."
                );
            }

            linkIds.add(record.id);

            if (record.status === IdentityLinkStatus.REVOKED) {
                return;
            }

            if (
                activeDiscordUserIds.has(record.discordUserId) ||
                activeGameUserIds.has(record.gameUserId)
            ) {
                throw new Error(
                    "Stored active Identity links violate uniqueness."
                );
            }

            activeDiscordUserIds.add(record.discordUserId);
            activeGameUserIds.add(record.gameUserId);

        });

    }

    validateDiscordUserId(discordUserId) {

        if (
            typeof discordUserId !== "string" ||
            discordUserId.trim().length === 0 ||
            discordUserId !== discordUserId.trim()
        ) {
            throw new Error(
                "Discord user ID is required."
            );
        }

    }

    validateVerification(verification) {

        if (
            !verification ||
            typeof verification !== "object" ||
            Array.isArray(verification)
        ) {
            throw new Error(
                "Verified identity proof is required."
            );
        }

        const keys = Object.keys(verification).sort();
        const requiredKeys = ["outcome", "verified"];

        if (
            keys.length !== requiredKeys.length ||
            keys.some((key, index) => key !== requiredKeys[index]) ||
            verification.verified !== true ||
            verification.outcome !== "VERIFIED"
        ) {
            throw new Error(
                "Verified identity proof is required."
            );
        }

    }

    createRecord(link) {
        return new IdentityLinkRecord({
            id: link.id,
            discordUserId: link.discordUserId,
            gameUserId: link.gameUserId,
            status: link.status,
            createdAt: new Date(link.createdAt),
            verifiedAt: link.verifiedAt
                ? new Date(link.verifiedAt)
                : null,
            revokedAt: link.revokedAt
                ? new Date(link.revokedAt)
                : null
        });
    }

    getOwnStatus(discordUserId) {

        this.validateDiscordUserId(discordUserId);

        const storedLink =
            this.store.getActiveLinkByDiscordUserId(
                discordUserId
            );

        if (!storedLink) {
            return Object.freeze({
                linked: false,
                status: null,
                createdAt: null,
                verifiedAt: null,
                revokedAt: null
            });
        }

        const link = this.createRecord(storedLink);

        return Object.freeze({
            linked: true,
            status: link.status,
            createdAt: link.createdAt,
            verifiedAt: link.verifiedAt,
            revokedAt: link.revokedAt
        });

    }

    recordVerifiedSelfLink({
        discordUserId,
        gameUserId,
        verification,
        verifiedAt = new Date()
    } = {}) {

        this.validateDiscordUserId(discordUserId);
        this.validateVerification(verification);

        const link = new IdentityLinkRecord({
            id: "identity-link-pending",
            discordUserId,
            gameUserId,
            status: IdentityLinkStatus.VERIFIED,
            createdAt: verifiedAt,
            verifiedAt
        });
        const storedLink = this.store.createLink({
            discordUserId: link.discordUserId,
            gameUserId: link.gameUserId,
            status: link.status,
            createdAt: link.createdAt,
            verifiedAt: link.verifiedAt,
            revokedAt: link.revokedAt
        });

        return this.createRecord(storedLink);

    }

}

module.exports = IdentityModule;
