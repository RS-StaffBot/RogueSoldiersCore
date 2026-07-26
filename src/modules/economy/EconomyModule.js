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
        maximumLeaderboardLimit = 100,
        defaultTransactionPageSize = 25,
        maximumTransactionPageSize = 100
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

        if (
            typeof defaultTransactionPageSize !== "number" ||
            !Number.isSafeInteger(defaultTransactionPageSize) ||
            defaultTransactionPageSize <= 0
        ) {
            throw new Error(
                "Economy default transaction page size must " +
                "be a positive safe integer."
            );
        }

        if (
            typeof maximumTransactionPageSize !== "number" ||
            !Number.isSafeInteger(maximumTransactionPageSize) ||
            maximumTransactionPageSize <= 0
        ) {
            throw new Error(
                "Economy maximum transaction page size must " +
                "be a positive safe integer."
            );
        }

        if (
            defaultTransactionPageSize >
            maximumTransactionPageSize
        ) {
            throw new Error(
                "Economy default transaction page size cannot " +
                "exceed the maximum transaction page size."
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
        this.defaultTransactionPageSize =
            defaultTransactionPageSize;
        this.maximumTransactionPageSize =
            maximumTransactionPageSize;
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

    validateUserId(userId) {

        if (
            typeof userId !== "string" ||
            userId.trim().length === 0
        ) {
            throw new Error(
                "Economy user ID is required."
            );
        }

    }

    createAccountSnapshot(account) {

        return new EconomyAccount({
            userId: account.userId,
            balance: account.balance,
            createdAt: account.createdAt
        });

    }

    createTransactionSnapshot(transaction) {

        return new EconomyTransaction({
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            userId: transaction.userId,
            fromUserId: transaction.fromUserId,
            toUserId: transaction.toUserId,
            balanceAfter: transaction.balanceAfter,
            fromBalanceAfter: transaction.fromBalanceAfter,
            toBalanceAfter: transaction.toBalanceAfter,
            reason: transaction.reason,
            createdAt: transaction.createdAt
        });

    }

    hasAccount(userId) {

        this.validateUserId(userId);

        return this.accounts.has(userId);
    }

    createAccount(userId) {

        this.validateUserId(userId);

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

        return this.createAccountSnapshot(account);

    }

    getInternalAccount(userId) {

        this.validateUserId(userId);

        return this.accounts.get(userId) || null;

    }

    ensureInternalAccount(userId) {

        const existingAccount =
            this.getInternalAccount(userId);

        if (existingAccount) {
            return existingAccount;
        }

        const account = new EconomyAccount({
            userId,
            balance: this.startingBalance
        });

        this.accounts.set(userId, account);

        return account;

    }

    getAccount(userId) {

        return this.createAccountSnapshot(
            this.ensureInternalAccount(userId)
        );

    }

    getBalance(userId) {
        return this.ensureInternalAccount(userId).balance;
    }

    prepareTransaction(transactionData) {

        return new EconomyTransaction({
            id: `economy-${this.nextTransactionId}`,
            ...transactionData
        });

    }

    createTransaction(transactionData) {

        const transaction = this.prepareTransaction(
            transactionData
        );

        this.transactions.push(transaction);
        this.nextTransactionId += 1;

        return this.createTransactionSnapshot(transaction);

    }

    commitBalanceTransaction({
        userId,
        account,
        balanceAfter,
        transaction
    }) {

        const accountExisted = this.accounts.has(userId);
        const balanceBefore = account.balance;
        const transactionCount = this.transactions.length;
        const transactionId = this.nextTransactionId;

        try {

            account.balance = balanceAfter;

            if (!accountExisted) {
                this.accounts.set(userId, account);
            }

            this.transactions.push(transaction);
            this.nextTransactionId += 1;

        } catch (error) {

            account.balance = balanceBefore;

            if (!accountExisted) {
                this.accounts.delete(userId);
            }

            this.transactions.length = transactionCount;
            this.nextTransactionId = transactionId;

            throw error;

        }

    }

    credit(
        userId,
        amount,
        reason = "Economy credit."
    ) {

        this.validateUserId(userId);

        const account =
            this.getInternalAccount(userId) ||
            new EconomyAccount({
                userId,
                balance: this.startingBalance
            });

        account.validateAmount(amount);

        const balanceAfter = account.balance + amount;

        account.validateBalance(balanceAfter);

        const transaction = this.prepareTransaction({
            type: EconomyTransactionType.CREDIT,
            userId,
            amount,
            balanceAfter,
            reason
        });

        this.commitBalanceTransaction({
            userId,
            account,
            balanceAfter,
            transaction
        });

        return balanceAfter;

    }

    debit(
        userId,
        amount,
        reason = "Economy debit."
    ) {

        this.validateUserId(userId);

        const account =
            this.getInternalAccount(userId) ||
            new EconomyAccount({
                userId,
                balance: this.startingBalance
            });

        account.validateAmount(amount);

        if (amount > account.balance) {
            throw new Error(
                `Insufficient economy balance for user: ${userId}`
            );
        }

        const balanceAfter = account.balance - amount;

        const transaction = this.prepareTransaction({
            type: EconomyTransactionType.DEBIT,
            userId,
            amount,
            balanceAfter,
            reason
        });

        this.commitBalanceTransaction({
            userId,
            account,
            balanceAfter,
            transaction
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
                this.maximumLeaderboardLimit,
            defaultTransactionPageSize:
                this.defaultTransactionPageSize,
            maximumTransactionPageSize:
                this.maximumTransactionPageSize
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
                "Economy default leaderboard limit must be a " +
                "positive safe integer."
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

    getDefaultTransactionPageSize() {
        return this.defaultTransactionPageSize;
    }

    setDefaultTransactionPageSize(
        defaultTransactionPageSize
    ) {

        if (
            typeof defaultTransactionPageSize !== "number" ||
            !Number.isSafeInteger(defaultTransactionPageSize) ||
            defaultTransactionPageSize <= 0
        ) {
            throw new Error(
                "Economy default transaction page size must " +
                "be a positive safe integer."
            );
        }

        if (
            defaultTransactionPageSize >
            this.maximumTransactionPageSize
        ) {
            throw new Error(
                "Economy default transaction page size cannot " +
                "exceed the maximum transaction page size."
            );
        }

        this.defaultTransactionPageSize =
            defaultTransactionPageSize;

        return this.defaultTransactionPageSize;

    }

    getMaximumTransactionPageSize() {
        return this.maximumTransactionPageSize;
    }

    setMaximumTransactionPageSize(
        maximumTransactionPageSize
    ) {

        if (
            typeof maximumTransactionPageSize !== "number" ||
            !Number.isSafeInteger(maximumTransactionPageSize) ||
            maximumTransactionPageSize <= 0
        ) {
            throw new Error(
                "Economy maximum transaction page size must " +
                "be a positive safe integer."
            );
        }

        if (
            maximumTransactionPageSize <
            this.defaultTransactionPageSize
        ) {
            throw new Error(
                "Economy maximum transaction page size cannot " +
                "be lower than the default transaction page size."
            );
        }

        this.maximumTransactionPageSize =
            maximumTransactionPageSize;

        return this.maximumTransactionPageSize;

    }

    getLastDailyClaim(userId) {

        this.validateUserId(userId);

        if (!this.lastDailyClaims.has(userId)) {
            return null;
        }

        return new Date(
            this.lastDailyClaims.get(userId).getTime()
        );

    }

    getDailyStatus(
        userId,
        currentDate = new Date()
    ) {

        this.validateDate(
            currentDate,
            "daily status"
        );

        this.validateUserId(userId);

        const internalLastClaimAt =
            this.lastDailyClaims.get(userId) || null;

        if (!internalLastClaimAt) {
            return {
                available: true,
                remainingMs: 0,
                lastClaimAt: null,
                nextClaimAt: new Date(
                    currentDate.getTime()
                )
            };
        }

        const nextClaimAt = new Date(
            internalLastClaimAt.getTime() +
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
            lastClaimAt: new Date(
                internalLastClaimAt.getTime()
            ),
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
        this.validateUserId(userId);

        const status = this.getDailyStatus(
            userId,
            claimedAt
        );

        if (!status.available) {
            throw new Error(
                "Economy daily reward is still on cooldown."
            );
        }

        const account =
            this.getInternalAccount(userId) ||
            new EconomyAccount({
                userId,
                balance: this.startingBalance
            });

        account.validateAmount(this.dailyRewardAmount);

        const balanceAfter =
            account.balance + this.dailyRewardAmount;

        account.validateBalance(balanceAfter);

        const transaction = this.prepareTransaction({
            type: EconomyTransactionType.CREDIT,
            userId,
            amount: this.dailyRewardAmount,
            balanceAfter,
            reason: "Daily reward."
        });

        const accountExisted = this.accounts.has(userId);
        const balanceBefore = account.balance;
        const transactionCount = this.transactions.length;
        const transactionId = this.nextTransactionId;
        const hadLastClaim =
            this.lastDailyClaims.has(userId);
        const previousLastClaim =
            this.lastDailyClaims.get(userId);

        try {

            this.lastDailyClaims.set(
                userId,
                new Date(claimedAt.getTime())
            );
            account.balance = balanceAfter;

            if (!accountExisted) {
                this.accounts.set(userId, account);
            }

            this.transactions.push(transaction);
            this.nextTransactionId += 1;

        } catch (error) {

            account.balance = balanceBefore;

            if (!accountExisted) {
                this.accounts.delete(userId);
            }

            if (hadLastClaim) {
                this.lastDailyClaims.set(
                    userId,
                    previousLastClaim
                );
            } else {
                this.lastDailyClaims.delete(userId);
            }

            this.transactions.length = transactionCount;
            this.nextTransactionId = transactionId;

            throw error;

        }

        return {
            userId,
            amount: this.dailyRewardAmount,
            balanceAfter,
            claimedAt: new Date(claimedAt.getTime()),
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

        this.validateUserId(fromUserId);
        this.validateUserId(toUserId);
        this.requireTransferPermission(actorPermissions);

        if (fromUserId === toUserId) {
            throw new Error(
                "Economy transfers require different accounts."
            );
        }

        const fromAccount =
            this.getInternalAccount(fromUserId) ||
            new EconomyAccount({
                userId: fromUserId,
                balance: this.startingBalance
            });
        const toAccount =
            this.getInternalAccount(toUserId) ||
            new EconomyAccount({
                userId: toUserId,
                balance: this.startingBalance
            });

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

        const sourceBalance =
            fromAccount.balance - amount;

        const result = {
            fromUserId,
            toUserId,
            amount,
            fromBalance: sourceBalance,
            toBalance: recipientBalance
        };

        const transaction = this.prepareTransaction({
            type: EconomyTransactionType.TRANSFER,
            fromUserId,
            toUserId,
            amount,
            fromBalanceAfter: result.fromBalance,
            toBalanceAfter: result.toBalance,
            reason
        });

        const sourceExisted =
            this.accounts.has(fromUserId);
        const destinationExisted =
            this.accounts.has(toUserId);
        const sourceBalanceBefore = fromAccount.balance;
        const destinationBalanceBefore = toAccount.balance;
        const transactionCount = this.transactions.length;
        const transactionId = this.nextTransactionId;

        try {

            fromAccount.balance = sourceBalance;
            toAccount.balance = recipientBalance;

            if (!sourceExisted) {
                this.accounts.set(fromUserId, fromAccount);
            }

            if (!destinationExisted) {
                this.accounts.set(toUserId, toAccount);
            }

            this.transactions.push(transaction);
            this.nextTransactionId += 1;

        } catch (error) {

            fromAccount.balance = sourceBalanceBefore;
            toAccount.balance = destinationBalanceBefore;

            if (!sourceExisted) {
                this.accounts.delete(fromUserId);
            }

            if (!destinationExisted) {
                this.accounts.delete(toUserId);
            }

            this.transactions.length = transactionCount;
            this.nextTransactionId = transactionId;

            throw error;

        }

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
        return this.transactions.map(
            transaction =>
                this.createTransactionSnapshot(transaction)
        );
    }

    listTransactionsForUser(userId) {

        this.validateUserId(userId);

        return this.transactions.filter(
            (transaction) =>
                transaction.userId === userId ||
                transaction.fromUserId === userId ||
                transaction.toUserId === userId
        ).map(
            transaction =>
                this.createTransactionSnapshot(transaction)
        );

    }

    getTransactionPage({
        userId,
        page = 1,
        pageSize = this.defaultTransactionPageSize
    } = {}) {

        if (
            typeof page !== "number" ||
            !Number.isSafeInteger(page) ||
            page <= 0
        ) {
            throw new Error(
                "Economy transaction page must be a " +
                "positive safe integer."
            );
        }

        if (
            typeof pageSize !== "number" ||
            !Number.isSafeInteger(pageSize) ||
            pageSize <= 0
        ) {
            throw new Error(
                "Economy transaction page size must be a " +
                "positive safe integer."
            );
        }

        if (pageSize > this.maximumTransactionPageSize) {
            throw new Error(
                "Economy transaction page size cannot exceed " +
                `${this.maximumTransactionPageSize}.`
            );
        }

        let transactions = this.transactions.map(
            (transaction, insertionIndex) => ({
                transaction,
                insertionIndex
            })
        );

        if (userId !== undefined) {
            this.validateUserId(userId);

            transactions = transactions.filter(
                ({ transaction }) =>
                    transaction.userId === userId ||
                    transaction.fromUserId === userId ||
                    transaction.toUserId === userId
            );
        }

        transactions.sort(
            (firstEntry, secondEntry) => {

                const dateDifference =
                    secondEntry.transaction.createdAt.getTime() -
                    firstEntry.transaction.createdAt.getTime();

                if (dateDifference !== 0) {
                    return dateDifference;
                }

                return (
                    secondEntry.insertionIndex -
                    firstEntry.insertionIndex
                );

            }
        );

        const totalItems = transactions.length;
        const totalPages = Math.ceil(
            totalItems / pageSize
        );
        const startIndex = (page - 1) * pageSize;
        const items = transactions
            .slice(startIndex, startIndex + pageSize)
            .map(({ transaction }) =>
                this.createTransactionSnapshot(transaction)
            );

        return {
            items,
            page,
            pageSize,
            totalItems,
            totalPages,
            hasPreviousPage:
                totalPages > 0 && page > 1,
            hasNextPage:
                totalPages > 0 && page < totalPages
        };

    }

    getAccountCount() {
        return this.accounts.size;
    }

    listAccounts() {
        return [...this.accounts.values()].map(
            account => this.createAccountSnapshot(account)
        );
    }

}

module.exports = EconomyModule;
