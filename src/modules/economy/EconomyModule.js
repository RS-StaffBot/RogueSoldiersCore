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
        transferPolicy = EconomyTransferPolicy.STAFF_ONLY,
        dailyRewardAmount = 100,
        dailyCooldownMs = 24 * 60 * 60 * 1000,
        defaultLeaderboardLimit = 10,
        maximumLeaderboardLimit = 100
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

        if (
            typeof dailyRewardAmount !== "number" ||
            !Number.isSafeInteger(dailyRewardAmount) ||
            dailyRewardAmount <= 0
        ) {
            throw new Error(
                "Economy daily reward must be a " +
                "positive safe integer."
            );
        }

        if (
            typeof dailyCooldownMs !== "number" ||
            !Number.isSafeInteger(dailyCooldownMs) ||
            dailyCooldownMs <= 0
        ) {
            throw new Error(
                "Economy daily cooldown must be a " +
                "positive safe integer."
            );
        }

        if (
            typeof defaultLeaderboardLimit !== "number" ||
    !Number.isSafeInteger(defaultLeaderboardLimit) ||
    defaultLeaderboardLimit <= 0
        ) {
            throw new Error(
                "Economy default leaderboard limit must be a " +
        "positive safe integer."
            );
        }

        if (
            typeof maximumLeaderboardLimit !== "number" ||
    !Number.isSafeInteger(maximumLeaderboardLimit) ||
    maximumLeaderboardLimit <= 0
        ) {
            throw new Error(
                "Economy maximum leaderboard limit must be a " +
        "positive safe integer."
            );
        }

        if (
            defaultLeaderboardLimit >
    maximumLeaderboardLimit
        ) {
            throw new Error(
                "Economy default leaderboard limit cannot " +
        "exceed the maximum leaderboard limit."
            );
        }

        this.startingBalance = startingBalance;
        this.transferPolicy = transferPolicy;
        this.dailyRewardAmount = dailyRewardAmount;
        this.dailyCooldownMs = dailyCooldownMs;
        this.defaultLeaderboardLimit =
            defaultLeaderboardLimit;
        this.maximumLeaderboardLimit =
            maximumLeaderboardLimit;
        this.accounts = new Map();
        this.transactions = [];
        this.nextTransactionId = 1;
        this.lastDailyClaims = new Map();

    }

    validateDate(date, fieldName) {

        if (
            !(date instanceof Date) ||
            Number.isNaN(date.getTime())
        ) {
            throw new Error(
                `Economy ${fieldName} date is invalid.`
            );
        }

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

    getConfiguration() {

        return {
            startingBalance: this.startingBalance,
            transferPolicy: this.transferPolicy,
            dailyRewardAmount: this.dailyRewardAmount,
            dailyCooldownMs: this.dailyCooldownMs,
            defaultLeaderboardLimit:
            this.defaultLeaderboardLimit,
            maximumLeaderboardLimit:
            this.maximumLeaderboardLimit
        };

    }

    getDailyRewardAmount() {
        return this.dailyRewardAmount;
    }

    setDailyRewardAmount(dailyRewardAmount) {

        if (
            typeof dailyRewardAmount !== "number" ||
        !Number.isSafeInteger(dailyRewardAmount) ||
        dailyRewardAmount <= 0
        ) {
            throw new Error(
                "Economy daily reward must be a " +
            "positive safe integer."
            );
        }

        this.dailyRewardAmount = dailyRewardAmount;

        return this.dailyRewardAmount;

    }

    getDailyCooldownMs() {
        return this.dailyCooldownMs;
    }

    setDailyCooldownMs(dailyCooldownMs) {

        if (
            typeof dailyCooldownMs !== "number" ||
        !Number.isSafeInteger(dailyCooldownMs) ||
        dailyCooldownMs <= 0
        ) {
            throw new Error(
                "Economy daily cooldown must be a " +
            "positive safe integer."
            );
        }

        this.dailyCooldownMs = dailyCooldownMs;

        return this.dailyCooldownMs;

    }

    getDefaultLeaderboardLimit() {
        return this.defaultLeaderboardLimit;
    }

    setDefaultLeaderboardLimit(
        defaultLeaderboardLimit
    ) {

        if (
            typeof defaultLeaderboardLimit !== "number" ||
        !Number.isSafeInteger(defaultLeaderboardLimit) ||
        defaultLeaderboardLimit <= 0
        ) {
            throw new Error(
                "Economy default leaderboard limit must " +
            "be a positive safe integer."
            );
        }

        if (
            defaultLeaderboardLimit >
        this.maximumLeaderboardLimit
        ) {
            throw new Error(
                "Economy default leaderboard limit cannot " +
            "exceed the maximum leaderboard limit."
            );
        }

        this.defaultLeaderboardLimit =
        defaultLeaderboardLimit;

        return this.defaultLeaderboardLimit;

    }

    getMaximumLeaderboardLimit() {
        return this.maximumLeaderboardLimit;
    }

    setMaximumLeaderboardLimit(
        maximumLeaderboardLimit
    ) {

        if (
            typeof maximumLeaderboardLimit !== "number" ||
        !Number.isSafeInteger(maximumLeaderboardLimit) ||
        maximumLeaderboardLimit <= 0
        ) {
            throw new Error(
                "Economy maximum leaderboard limit must " +
            "be a positive safe integer."
            );
        }

        if (
            maximumLeaderboardLimit <
        this.defaultLeaderboardLimit
        ) {
            throw new Error(
                "Economy maximum leaderboard limit cannot " +
            "be lower than the default leaderboard limit."
            );
        }

        this.maximumLeaderboardLimit =
        maximumLeaderboardLimit;

        return this.maximumLeaderboardLimit;

    }

    getDailyCooldownMs() {
        return this.dailyCooldownMs;
    }

    getLastDailyClaim(userId) {

        if (!this.lastDailyClaims.has(userId)) {
            return null;
        }

        return this.lastDailyClaims.get(userId);

    }

    getDailyStatus(
        userId,
        currentDate = new Date()
    ) {

        this.validateDate(
            currentDate,
            "daily status"
        );

        const lastClaimAt = this.getLastDailyClaim(userId);

        if (!lastClaimAt) {
            return {
                available: true,
                remainingMs: 0,
                lastClaimAt: null,
                nextClaimAt: currentDate
            };
        }

        const nextClaimAt = new Date(
            lastClaimAt.getTime() +
            this.dailyCooldownMs
        );

        const remainingMs = Math.max(
            0,
            nextClaimAt.getTime() -
            currentDate.getTime()
        );

        return {
            available: remainingMs === 0,
            remainingMs,
            lastClaimAt,
            nextClaimAt
        };

    }

    canClaimDaily(
        userId,
        currentDate = new Date()
    ) {

        return this.getDailyStatus(
            userId,
            currentDate
        ).available;

    }

    claimDaily(
        userId,
        claimedAt = new Date()
    ) {

        this.validateDate(
            claimedAt,
            "daily claim"
        );

        const status = this.getDailyStatus(
            userId,
            claimedAt
        );

        if (!status.available) {
            throw new Error(
                "Economy daily reward is still on cooldown."
            );
        }

        const balanceAfter = this.credit(
            userId,
            this.dailyRewardAmount,
            "Daily reward."
        );

        this.lastDailyClaims.set(
            userId,
            claimedAt
        );

        return {
            userId,
            amount: this.dailyRewardAmount,
            balanceAfter,
            claimedAt,
            nextClaimAt: new Date(
                claimedAt.getTime() +
                this.dailyCooldownMs
            )
        };

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

        const recipientBalance =
            toAccount.balance + amount;

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

    getLeaderboard(
        limit = this.defaultLeaderboardLimit
    ) {

        if (
            typeof limit !== "number" ||
        !Number.isSafeInteger(limit) ||
        limit <= 0
        ) {
            throw new Error(
                "Economy leaderboard limit must be a " +
            "positive safe integer."
            );
        }

        if (limit > this.maximumLeaderboardLimit) {
            throw new Error(
                "Economy leaderboard limit cannot exceed " +
            `${this.maximumLeaderboardLimit}.`
            );
        }

        return [...this.accounts.values()]
            .sort((firstAccount, secondAccount) => {

                if (
                    firstAccount.balance !==
                secondAccount.balance
                ) {
                    return (
                        secondAccount.balance -
                    firstAccount.balance
                    );
                }

                return firstAccount.userId.localeCompare(
                    secondAccount.userId
                );

            })
            .slice(0, limit)
            .map((account, index) => ({
                rank: index + 1,
                userId: account.userId,
                balance: account.balance
            }));

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