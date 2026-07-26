const BaseModule = require("../core/BaseModule");
const ComponentState = require(
    "../../core/ComponentState"
);
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
const InMemoryEconomyStore = require(
    "./persistence/InMemoryEconomyStore"
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
        maximumTransactionPageSize = 100,
        store = new InMemoryEconomyStore()
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
        this.validateStore(store);
        this.store = store;

    }

    validateStore(store) {

        const requiredMethods = [
            "hasAccount",
            "createAccount",
            "ensureAccount",
            "getAccount",
            "listAccounts",
            "countAccounts",
            "getLastDailyClaim",
            "listDailyClaims",
            "commitBalanceTransaction",
            "commitTransfer",
            "commitDailyClaim",
            "listTransactions",
            "listTransactionsForUser",
            "countTransactions",
            "getTransactionPage",
            "getLeaderboard"
        ];

        if (
            !store ||
            requiredMethods.some(
                method =>
                    typeof store[method] !== "function"
            )
        ) {
            throw new Error(
                "Economy store does not implement the " +
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
                "Economy durable state is invalid."
            );
        }

        this.state = ComponentState.READY;

    }

    validateDurableState() {

        const accounts = this.store.listAccounts();
        const accountIds = new Set();

        for (const accountData of accounts) {

            const account = this.createAccountSnapshot(
                accountData
            );

            if (accountIds.has(account.userId)) {
                throw new Error(
                    "Stored economy account is duplicated."
                );
            }

            accountIds.add(account.userId);

        }

        const transactionIds = new Set();

        for (
            const transactionData of
            this.store.listTransactions()
        ) {

            const transaction =
                this.createTransactionSnapshot(
                    transactionData
                );

            if (
                !/^economy-[1-9]\d*$/.test(
                    transaction.id
                ) ||
                transactionIds.has(transaction.id)
            ) {
                throw new Error(
                    "Stored economy transaction ID is invalid."
                );
            }

            const participantIds = [
                transaction.userId,
                transaction.fromUserId,
                transaction.toUserId
            ].filter(userId => userId !== null);

            if (
                participantIds.some(
                    userId => !accountIds.has(userId)
                )
            ) {
                throw new Error(
                    "Stored economy transaction account is missing."
                );
            }

            transactionIds.add(transaction.id);

        }

        const dailyClaimUserIds = new Set();

        for (
            const claim of this.store.listDailyClaims()
        ) {

            this.validateUserId(claim.userId);
            this.validateDate(
                new Date(claim.claimedAt),
                "stored daily claim"
            );

            if (!accountIds.has(claim.userId)) {
                throw new Error(
                    "Stored economy daily claim account is missing."
                );
            }

            if (dailyClaimUserIds.has(claim.userId)) {
                throw new Error(
                    "Stored economy daily claim is duplicated."
                );
            }

            dailyClaimUserIds.add(claim.userId);

        }

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
            createdAt: account.createdAt instanceof Date
                ? account.createdAt
                : new Date(account.createdAt)
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
            createdAt: transaction.createdAt instanceof Date
                ? transaction.createdAt
                : new Date(transaction.createdAt)
        });

    }

    createStoredAccount(account) {
        return {
            userId: account.userId,
            balance: account.balance,
            createdAt: account.createdAt.toISOString()
        };
    }

    createStoredTransaction(transactionData) {

        const transaction = new EconomyTransaction({
            id: "economy-pending",
            ...transactionData
        });

        return {
            type: transaction.type,
            amount: transaction.amount,
            userId: transaction.userId,
            fromUserId: transaction.fromUserId,
            toUserId: transaction.toUserId,
            balanceAfter: transaction.balanceAfter,
            fromBalanceAfter:
                transaction.fromBalanceAfter,
            toBalanceAfter: transaction.toBalanceAfter,
            reason: transaction.reason,
            createdAt: transaction.createdAt.toISOString()
        };

    }

    hasAccount(userId) {

        this.validateUserId(userId);

        return this.store.hasAccount(userId);
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

        return this.createAccountSnapshot(
            this.store.createAccount(
                this.createStoredAccount(account)
            )
        );

    }

    getInternalAccount(userId) {

        this.validateUserId(userId);

        const account = this.store.getAccount(userId);

        return account
            ? this.createAccountSnapshot(account)
            : null;

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

        return this.createAccountSnapshot(
            this.store.ensureAccount(
                this.createStoredAccount(account)
            )
        );

    }

    getAccount(userId) {

        return this.createAccountSnapshot(
            this.ensureInternalAccount(userId)
        );

    }

    getBalance(userId) {
        return this.ensureInternalAccount(userId).balance;
    }

    credit(
        userId,
        amount,
        reason = "Economy credit."
    ) {

        this.validateUserId(userId);

        const expectedAccount =
            this.store.getAccount(userId);
        const account = expectedAccount
            ? this.createAccountSnapshot(expectedAccount)
            :
            new EconomyAccount({
                userId,
                balance: this.startingBalance
            });

        account.validateAmount(amount);

        const balanceAfter = account.balance + amount;

        account.validateBalance(balanceAfter);

        const transaction = this.createStoredTransaction({
            type: EconomyTransactionType.CREDIT,
            userId,
            amount,
            balanceAfter,
            reason
        });

        account.balance = balanceAfter;

        const storedTransaction =
            this.store.commitBalanceTransaction({
                expectedAccount,
                account: this.createStoredAccount(account),
                transaction
            });

        this.createTransactionSnapshot(
            storedTransaction
        );

        return balanceAfter;

    }

    debit(
        userId,
        amount,
        reason = "Economy debit."
    ) {

        this.validateUserId(userId);

        const expectedAccount =
            this.store.getAccount(userId);
        const account = expectedAccount
            ? this.createAccountSnapshot(expectedAccount)
            :
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

        const transaction = this.createStoredTransaction({
            type: EconomyTransactionType.DEBIT,
            userId,
            amount,
            balanceAfter,
            reason
        });

        account.balance = balanceAfter;

        const storedTransaction =
            this.store.commitBalanceTransaction({
                expectedAccount,
                account: this.createStoredAccount(account),
                transaction
            });

        this.createTransactionSnapshot(
            storedTransaction
        );

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

        const claimedAt =
            this.store.getLastDailyClaim(userId);

        if (claimedAt === null) {
            return null;
        }

        const claimDate = new Date(claimedAt);

        this.validateDate(
            claimDate,
            "stored daily claim"
        );

        return claimDate;

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
            this.getLastDailyClaim(userId);

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

        const expectedAccount =
            this.store.getAccount(userId);
        const account = expectedAccount
            ? this.createAccountSnapshot(expectedAccount)
            :
            new EconomyAccount({
                userId,
                balance: this.startingBalance
            });

        account.validateAmount(this.dailyRewardAmount);

        const balanceAfter =
            account.balance + this.dailyRewardAmount;

        account.validateBalance(balanceAfter);

        const transaction = this.createStoredTransaction({
            type: EconomyTransactionType.CREDIT,
            userId,
            amount: this.dailyRewardAmount,
            balanceAfter,
            reason: "Daily reward."
        });

        account.balance = balanceAfter;

        const storedTransaction =
            this.store.commitDailyClaim({
                expectedAccount,
                expectedClaimedAt:
                    status.lastClaimAt
                        ? status.lastClaimAt.toISOString()
                        : null,
                account: this.createStoredAccount(account),
                claimedAt: claimedAt.toISOString(),
                transaction
            });

        this.createTransactionSnapshot(
            storedTransaction
        );

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

        const expectedSource =
            this.store.getAccount(fromUserId);
        const expectedDestination =
            this.store.getAccount(toUserId);
        const fromAccount = expectedSource
            ? this.createAccountSnapshot(expectedSource)
            :
            new EconomyAccount({
                userId: fromUserId,
                balance: this.startingBalance
            });
        const toAccount = expectedDestination
            ? this.createAccountSnapshot(
                expectedDestination
            )
            :
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

        const transaction = this.createStoredTransaction({
            type: EconomyTransactionType.TRANSFER,
            fromUserId,
            toUserId,
            amount,
            fromBalanceAfter: result.fromBalance,
            toBalanceAfter: result.toBalance,
            reason
        });

        fromAccount.balance = sourceBalance;
        toAccount.balance = recipientBalance;

        const storedTransaction =
            this.store.commitTransfer({
                expectedSource,
                expectedDestination,
                sourceAccount:
                    this.createStoredAccount(fromAccount),
                destinationAccount:
                    this.createStoredAccount(toAccount),
                transaction
            });

        this.createTransactionSnapshot(
            storedTransaction
        );

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

        return this.store.getLeaderboard(limit)
            .map((account, index) => ({
                rank: index + 1,
                userId: account.userId,
                balance: account.balance
            }));

    }

    getTransactionCount() {
        return this.store.countTransactions();
    }

    listTransactions() {
        return this.store.listTransactions().map(
            transaction =>
                this.createTransactionSnapshot(transaction)
        );
    }

    listTransactionsForUser(userId) {

        this.validateUserId(userId);

        return this.store
            .listTransactionsForUser(userId)
            .map(
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

        if (userId !== undefined) {
            this.validateUserId(userId);
        }

        const storedPage = this.store.getTransactionPage({
            userId,
            page,
            pageSize
        });
        const totalItems = storedPage.totalItems;
        const totalPages = Math.ceil(
            totalItems / pageSize
        );
        const items = storedPage.items.map(
            transaction =>
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
        return this.store.countAccounts();
    }

    listAccounts() {
        return this.store.listAccounts().map(
            account => this.createAccountSnapshot(account)
        );
    }

}

module.exports = EconomyModule;
