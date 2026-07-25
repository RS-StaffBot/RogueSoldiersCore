const BaseModule = require("../core/BaseModule");
const EconomyAccount = require("./EconomyAccount");

class EconomyModule extends BaseModule {

    constructor({
        startingBalance = 0
    } = {}) {

        super("Economy");

        if (
            typeof startingBalance !== "number" ||
            !Number.isSafeInteger(startingBalance) ||
            startingBalance < 0
        ) {
            throw new Error(
                "Economy starting balance must be a " +
                "non-negative safe integer."
            );
        }

        this.startingBalance = startingBalance;
        this.accounts = new Map();

    }

    hasAccount(userId) {
        return this.accounts.has(userId);
    }

    createAccount(userId) {

        if (this.hasAccount(userId)) {
            throw new Error(
                `Economy account already exists: ${userId}`
            );
        }

        const account = new EconomyAccount({
            userId,
            balance: this.startingBalance
        });

        this.accounts.set(userId, account);

        return account;

    }

    getAccount(userId) {

        if (!this.hasAccount(userId)) {
            return this.createAccount(userId);
        }

        return this.accounts.get(userId);

    }

    getBalance(userId) {
        return this.getAccount(userId).balance;
    }

    getAccountCount() {
        return this.accounts.size;
    }

    listAccounts() {
        return [...this.accounts.values()];
    }

}

module.exports = EconomyModule;