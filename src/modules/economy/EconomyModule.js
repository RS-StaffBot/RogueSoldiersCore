const BaseModule = require("../core/BaseModule");
const EconomyAccount = require("./EconomyAccount");
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
            actorPermissions = []
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