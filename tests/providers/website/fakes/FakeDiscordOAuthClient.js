const { URLSearchParams } = require("node:url");

class FakeDiscordOAuthClient {

    constructor({
        exchangeCode = null,
        fetchCurrentGuildMember = null,
        fetchCurrentUser = null,
        revokeGrant = null
    } = {}) {

        this.exchangeCodeImplementation = exchangeCode;
        this.fetchCurrentGuildMemberImplementation =
            fetchCurrentGuildMember;
        this.fetchCurrentUserImplementation =
            fetchCurrentUser;
        this.revokeGrantImplementation = revokeGrant;
        this.authorizationCalls = [];
        this.exchangeCalls = [];
        this.guildMemberCalls = [];
        this.revokeCalls = [];
        this.userCalls = [];

    }

    createAuthorizationUrl(options) {
        this.authorizationCalls.push(options);

        return (
            "https://discord.com/oauth2/authorize?" +
            new URLSearchParams({
                code_challenge: options.codeChallenge,
                state: options.state
            }).toString()
        );
    }

    async exchangeCode(code, verifier) {
        this.exchangeCalls.push({
            code,
            verifier
        });

        if (this.exchangeCodeImplementation) {
            return this.exchangeCodeImplementation(
                code,
                verifier
            );
        }

        return {
            accessToken: "access-token",
            refreshToken: "refresh-token"
        };
    }

    async fetchCurrentUser(token) {
        this.userCalls.push(token);

        if (this.fetchCurrentUserImplementation) {
            return this.fetchCurrentUserImplementation(
                token
            );
        }

        return {
            bot: false,
            globalName: "Rogue Global",
            id: "123456789012345678",
            system: false,
            username: "rogue"
        };
    }

    async fetchCurrentGuildMember(token) {
        this.guildMemberCalls.push(token);

        if (this.fetchCurrentGuildMemberImplementation) {
            return this
                .fetchCurrentGuildMemberImplementation(
                    token
                );
        }

        return {
            flags: 0,
            nick: "Rogue Soldier",
            pending: false
        };
    }

    async revokeGrant(token) {
        this.revokeCalls.push(token);

        if (this.revokeGrantImplementation) {
            return this.revokeGrantImplementation(token);
        }

        return undefined;
    }

}

module.exports = FakeDiscordOAuthClient;
