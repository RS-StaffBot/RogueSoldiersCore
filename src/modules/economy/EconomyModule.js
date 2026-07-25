const BaseModule = require("../core/BaseModule");
const EconomyAccount = require("./EconomyAccount");
const EconomyTransaction = require(
    "./EconomyTransaction"
);
const EconomyTransactionType = require(
    "./EconomyTransactionType"
);
const EconomyTransferPolicy = require(
    "./EconomyTransferPolicy"
);
const EconomyPermission = require(
    "../../shared/permissions/EconomyPermission"
);

class EconomyModule extends BaseModule {

    constructor({
        startingBalance = 0,
        transferPolicy = EconomyTransferPolicy.STAFF_ONLY
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

        if (
            !Object.values(EconomyTransferPolicy)
                .includes(transferPolicy)
        ) {
            throw new Error(
                `Unsupported economy transfer policy: ${transferPolicy}`
            );
        }

        this.startingBalance = startingBalance;
        this.transferPolicy = transferPolicy;
        this.accounts = new Map();
        this.transactions = [];
        this.nextTransactionId = 1;

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

    createTransaction(transactionData) {

        const transaction = new EconomyTransaction({
            id: `economy-${this.nextTransactionId}`,
            ...transactionData
        });

        this.nextTransactionId += 1;
        this.transactions.push(transaction);

        return transaction;

    }

    credit(
        userId,
        amount,
        reason = "Economy credit."
    ) {

        const account = this.getAccount(userId);
        const balanceAfter = account.credit(amount);

        this.createTransaction({
            type: EconomyTransactionType.CREDIT,
            userId,
            amount,
            balanceAfter,
            reason
        });

        return balanceAfter;

    }

    debit(
        userId,
        amount,
        reason = "Economy debit."
    ) {

        const account = this.getAccount(userId);
        const balanceAfter = account.debit(amount);

        this.createTransaction({
            type: EconomyTransactionType.DEBIT,
            userId,
            amount,
            balanceAfter,
            reason
        });

        return balanceAfter;

    }

    getTransferPolicy() {
        return this.transferPolicy;
    }

    setTransferPolicy(transferPolicy) {

        if (
            !Object.values(EconomyTransferPolicy)
                .includes(transferPolicy)
        ) {
            throw new Error(
                `Unsupported economy transfer policy: ${transferPolicy}`
            );
        }

        this.transferPolicy = transferPolicy;

        return this.transferPolicy;

    }

    canTransfer(actorPermissions = []) {

        if (!Array.isArray(actorPermissions)) {
            throw new Error(
                "Economy actor permissions must be an array."
            );
        }

        if (
            this.transferPolicy ===
            EconomyTransferPolicy.DISABLED
        ) {
            return false;
        }

        if (
            this.transferPolicy ===
            EconomyTransferPolicy.EVERYONE
        ) {
            return true;
        }

        return (
            actorPermissions.includes(
                EconomyPermission.TRANSFER
            ) ||
            actorPermissions.includes(
                EconomyPermission.ADMINISTRATE
            )
        );

    }

    requireTransferPermission(actorPermissions = []) {

        if (!this.canTransfer(actorPermissions)) {

            if (
                this.transferPolicy ===
                EconomyTransferPolicy.DISABLED
            ) {
                throw new Error(
                    "Economy transfers are currently disabled."
                );
            }

            throw new Error(
                "Economy transfer permission is required."
            );

        }

    }

    transfer(
        fromUserId,
        toUserId,
        amount,
        {
            actorPermissions = [],
            reason = "Economy transfer."
        } = {}
    ) {

        this.requireTransferPermission(actorPermissions);

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

        const result = {
            fromUserId,
            toUserId,
            amount,
            fromBalance: fromAccount.balance,
            toBalance: toAccount.balance
        };

        this.createTransaction({
            type: EconomyTransactionType.TRANSFER,
            fromUserId,
            toUserId,
            amount,
            fromBalanceAfter: result.fromBalance,
            toBalanceAfter: result.toBalance,
            reason
        });

        return result;

    }

    getTransactionCount() {
        return this.transactions.length;
    }

    listTransactions() {
        return [...this.transactions];
    }

    listTransactionsForUser(userId) {

        return this.transactions.filter(
            (transaction) =>
                transaction.userId === userId ||
                transaction.fromUserId === userId ||
                transaction.toUserId === userId
        );

    }

    getAccountCount() {
        return this.accounts.size;
    }

    listAccounts() {
        return [...this.accounts.values()];
    }

}

module.exports = EconomyModule;