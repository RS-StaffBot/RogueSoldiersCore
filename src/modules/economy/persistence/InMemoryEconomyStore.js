class InMemoryEconomyStore {

    constructor() {
        this.accounts = new Map();
        this.transactions = [];
        this.dailyClaims = new Map();
        this.nextTransactionSequence = 1;
    }

    hasAccount(userId) {
        return this.accounts.has(userId);
    }

    createAccount(account) {

        if (this.accounts.has(account.userId)) {
            throw new Error(
                `Economy account already exists: ${account.userId}`
            );
        }

        const storedAccount = this.copyAccount(account);

        this.accounts.set(
            storedAccount.userId,
            storedAccount
        );

        return this.copyAccount(storedAccount);

    }

    ensureAccount(account) {

        const existingAccount = this.accounts.get(
            account.userId
        );

        if (existingAccount) {
            return this.copyAccount(existingAccount);
        }

        return this.createAccount(account);

    }

    getAccount(userId) {

        const account = this.accounts.get(userId);

        return account
            ? this.copyAccount(account)
            : null;

    }

    listAccounts() {
        return [...this.accounts.values()].map(
            account => this.copyAccount(account)
        );
    }

    countAccounts() {
        return this.accounts.size;
    }

    getLastDailyClaim(userId) {
        return this.dailyClaims.get(userId) || null;
    }

    listDailyClaims() {
        return [...this.dailyClaims.entries()].map(
            ([userId, claimedAt]) => ({
                userId,
                claimedAt
            })
        );
    }

    commitBalanceTransaction({
        expectedAccount,
        account,
        transaction
    }) {

        this.requireExpectedAccount(
            account.userId,
            expectedAccount
        );

        const storedTransaction =
            this.createStoredTransaction(transaction);
        const previousAccount = this.accounts.get(
            account.userId
        );
        const previousTransactionCount =
            this.transactions.length;
        const previousSequence =
            this.nextTransactionSequence;

        try {

            this.accounts.set(
                account.userId,
                this.copyAccount(account)
            );
            this.transactions.push(storedTransaction);
            this.nextTransactionSequence += 1;

        } catch (error) {

            if (previousAccount) {
                Map.prototype.set.call(
                    this.accounts,
                    account.userId,
                    previousAccount
                );
            } else {
                Map.prototype.delete.call(
                    this.accounts,
                    account.userId
                );
            }

            this.transactions.length =
                previousTransactionCount;
            this.nextTransactionSequence =
                previousSequence;

            throw error;

        }

        return this.copyTransaction(storedTransaction);

    }

    commitTransfer({
        expectedSource,
        expectedDestination,
        sourceAccount,
        destinationAccount,
        transaction
    }) {

        this.requireExpectedAccount(
            sourceAccount.userId,
            expectedSource
        );
        this.requireExpectedAccount(
            destinationAccount.userId,
            expectedDestination
        );

        const storedTransaction =
            this.createStoredTransaction(transaction);
        const previousSource = this.accounts.get(
            sourceAccount.userId
        );
        const previousDestination = this.accounts.get(
            destinationAccount.userId
        );
        const previousTransactionCount =
            this.transactions.length;
        const previousSequence =
            this.nextTransactionSequence;

        try {

            this.accounts.set(
                sourceAccount.userId,
                this.copyAccount(sourceAccount)
            );
            this.accounts.set(
                destinationAccount.userId,
                this.copyAccount(destinationAccount)
            );
            this.transactions.push(storedTransaction);
            this.nextTransactionSequence += 1;

        } catch (error) {

            this.restoreAccount(
                sourceAccount.userId,
                previousSource
            );
            this.restoreAccount(
                destinationAccount.userId,
                previousDestination
            );
            this.transactions.length =
                previousTransactionCount;
            this.nextTransactionSequence =
                previousSequence;

            throw error;

        }

        return this.copyTransaction(storedTransaction);

    }

    commitDailyClaim({
        expectedAccount,
        expectedClaimedAt,
        account,
        claimedAt,
        transaction
    }) {

        this.requireExpectedAccount(
            account.userId,
            expectedAccount
        );

        const currentClaimedAt =
            this.dailyClaims.get(account.userId) || null;

        if (currentClaimedAt !== expectedClaimedAt) {
            throw new Error(
                "Economy state changed; retry the operation."
            );
        }

        const storedTransaction =
            this.createStoredTransaction(transaction);
        const previousAccount = this.accounts.get(
            account.userId
        );
        const hadClaim = this.dailyClaims.has(
            account.userId
        );
        const previousClaimedAt =
            this.dailyClaims.get(account.userId);
        const previousTransactionCount =
            this.transactions.length;
        const previousSequence =
            this.nextTransactionSequence;

        try {

            this.accounts.set(
                account.userId,
                this.copyAccount(account)
            );
            this.dailyClaims.set(
                account.userId,
                claimedAt
            );
            this.transactions.push(storedTransaction);
            this.nextTransactionSequence += 1;

        } catch (error) {

            this.restoreAccount(
                account.userId,
                previousAccount
            );

            if (hadClaim) {
                Map.prototype.set.call(
                    this.dailyClaims,
                    account.userId,
                    previousClaimedAt
                );
            } else {
                Map.prototype.delete.call(
                    this.dailyClaims,
                    account.userId
                );
            }

            this.transactions.length =
                previousTransactionCount;
            this.nextTransactionSequence =
                previousSequence;

            throw error;

        }

        return this.copyTransaction(storedTransaction);

    }

    listTransactions() {
        return this.transactions.map(
            transaction =>
                this.copyTransaction(transaction)
        );
    }

    listTransactionsForUser(userId) {
        return this.transactions.filter(
            transaction =>
                transaction.userId === userId ||
                transaction.fromUserId === userId ||
                transaction.toUserId === userId
        ).map(
            transaction =>
                this.copyTransaction(transaction)
        );
    }

    countTransactions() {
        return this.transactions.length;
    }

    getTransactionPage({
        userId,
        page,
        pageSize
    }) {

        let transactions = this.transactions.map(
            (transaction, insertionIndex) => ({
                transaction,
                insertionIndex
            })
        );

        if (userId !== undefined) {
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
                    Date.parse(
                        secondEntry.transaction.createdAt
                    ) -
                    Date.parse(
                        firstEntry.transaction.createdAt
                    );

                return dateDifference ||
                    secondEntry.insertionIndex -
                    firstEntry.insertionIndex;

            }
        );

        const totalItems = transactions.length;
        const startIndex = (page - 1) * pageSize;

        return {
            items: transactions
                .slice(startIndex, startIndex + pageSize)
                .map(({ transaction }) =>
                    this.copyTransaction(transaction)
                ),
            totalItems
        };

    }

    getLeaderboard(limit) {

        return [...this.accounts.values()]
            .sort((firstAccount, secondAccount) =>
                secondAccount.balance -
                    firstAccount.balance ||
                firstAccount.userId.localeCompare(
                    secondAccount.userId
                )
            )
            .slice(0, limit)
            .map(account => ({
                userId: account.userId,
                balance: account.balance
            }));

    }

    requireExpectedAccount(userId, expectedAccount) {

        const currentAccount =
            this.accounts.get(userId) || null;

        if (
            (currentAccount === null) !==
            (expectedAccount === null) ||
            (
                currentAccount &&
                (
                    currentAccount.balance !==
                        expectedAccount.balance ||
                    currentAccount.createdAt !==
                        expectedAccount.createdAt
                )
            )
        ) {
            throw new Error(
                "Economy state changed; retry the operation."
            );
        }

    }

    createStoredTransaction(transaction) {

        const sequence = this.nextTransactionSequence;

        if (
            !Number.isSafeInteger(sequence) ||
            sequence <= 0 ||
            sequence >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                "Economy transaction ID sequence has " +
                "reached its safe limit."
            );
        }

        return this.copyTransaction({
            id: `economy-${sequence}`,
            ...transaction
        });

    }

    restoreAccount(userId, account) {

        if (account) {
            Map.prototype.set.call(
                this.accounts,
                userId,
                account
            );
        } else {
            Map.prototype.delete.call(
                this.accounts,
                userId
            );
        }

    }

    copyAccount(account) {
        return {
            userId: account.userId,
            balance: account.balance,
            createdAt: account.createdAt
        };
    }

    copyTransaction(transaction) {
        return {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            userId: transaction.userId ?? null,
            fromUserId: transaction.fromUserId ?? null,
            toUserId: transaction.toUserId ?? null,
            balanceAfter:
                transaction.balanceAfter ?? null,
            fromBalanceAfter:
                transaction.fromBalanceAfter ?? null,
            toBalanceAfter:
                transaction.toBalanceAfter ?? null,
            reason: transaction.reason,
            createdAt: transaction.createdAt
        };
    }

}

module.exports = InMemoryEconomyStore;
