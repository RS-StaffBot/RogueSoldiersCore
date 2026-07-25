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

    credit(userId, amount) {
        return this.getAccount(userId).credit(amount);
    }

    debit(userId, amount) {
        return this.getAccount(userId).debit(amount);
    }

    transfer(fromUserId, toUserId, amount) {

        if (fromUserId === toUserId) {
            throw new Error(
                "Economy transfers require different accounts."
            );
        }

        const fromAccount = this.getAccount(fromUserId);
        const toAccount = this.getAccount(toUserId);

        fromAccount.validateAmount(amount);

        if (amount > fromAccount.balance) {
            throw new Error(
                `Insufficient economy balance for user: ${fromUserId}`
            );
        }

        const recipientBalance = toAccount.balance + amount;

        if (!Number.isSafeInteger(recipientBalance)) {
            throw new Error(
                "Economy balance would exceed the safe integer limit."
            );
        }

        fromAccount.debit(amount);
        toAccount.credit(amount);

        return {
            fromUserId,
            toUserId,
            amount,
            fromBalance: fromAccount.balance,
            toBalance: toAccount.balance
        };

    }

    getAccountCount() {
        return this.accounts.size;
    }

    listAccounts() {
        return [...this.accounts.values()];
    }

}

module.exports = EconomyModule;