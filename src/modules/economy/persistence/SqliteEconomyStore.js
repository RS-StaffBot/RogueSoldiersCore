class SqliteEconomyStore {

    #database;
    #selectAccount;
    #insertAccount;
    #updateAccount;
    #listAccounts;
    #countAccounts;
    #selectDailyClaim;
    #listDailyClaims;
    #insertDailyClaim;
    #updateDailyClaim;
    #insertTransaction;
    #listTransactions;
    #listUserTransactions;
    #countTransactions;
    #countUserTransactions;
    #pageTransactions;
    #pageUserTransactions;
    #leaderboard;

    constructor(database) {

        if (!database) {
            throw new Error(
                "A database connection is required for " +
                "Economy persistence."
            );
        }

        this.#database = database;
        this.#selectAccount = database.prepare(`
            SELECT
                user_id AS userId,
                balance,
                created_at AS createdAt
            FROM economy_accounts
            WHERE user_id = ?
        `);
        this.#insertAccount = database.prepare(`
            INSERT INTO economy_accounts (
                user_id,
                balance,
                created_at
            ) VALUES (?, ?, ?)
        `);
        this.#updateAccount = database.prepare(`
            UPDATE economy_accounts
            SET balance = ?, created_at = ?
            WHERE user_id = ?
        `);
        this.#listAccounts = database.prepare(`
            SELECT
                user_id AS userId,
                balance,
                created_at AS createdAt
            FROM economy_accounts
            ORDER BY sequence ASC
        `);
        this.#countAccounts = database.prepare(`
            SELECT COUNT(*) AS count
            FROM economy_accounts
        `);
        this.#selectDailyClaim = database.prepare(`
            SELECT claimed_at AS claimedAt
            FROM economy_daily_claims
            WHERE user_id = ?
        `);
        this.#listDailyClaims = database.prepare(`
            SELECT
                user_id AS userId,
                claimed_at AS claimedAt
            FROM economy_daily_claims
            ORDER BY user_id ASC
        `);
        this.#insertDailyClaim = database.prepare(`
            INSERT INTO economy_daily_claims (
                user_id,
                claimed_at
            ) VALUES (?, ?)
        `);
        this.#updateDailyClaim = database.prepare(`
            UPDATE economy_daily_claims
            SET claimed_at = ?
            WHERE user_id = ?
        `);
        this.#insertTransaction = database.prepare(`
            INSERT INTO economy_transactions (
                type,
                amount,
                user_id,
                from_user_id,
                to_user_id,
                balance_after,
                from_balance_after,
                to_balance_after,
                reason,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        this.#listTransactions = database.prepare(`
            SELECT
                sequence,
                type,
                amount,
                user_id AS userId,
                from_user_id AS fromUserId,
                to_user_id AS toUserId,
                balance_after AS balanceAfter,
                from_balance_after AS fromBalanceAfter,
                to_balance_after AS toBalanceAfter,
                reason,
                created_at AS createdAt
            FROM economy_transactions
            ORDER BY sequence ASC
        `);
        this.#listUserTransactions = database.prepare(`
            SELECT
                sequence,
                type,
                amount,
                user_id AS userId,
                from_user_id AS fromUserId,
                to_user_id AS toUserId,
                balance_after AS balanceAfter,
                from_balance_after AS fromBalanceAfter,
                to_balance_after AS toBalanceAfter,
                reason,
                created_at AS createdAt
            FROM economy_transactions
            WHERE
                user_id = ? OR
                from_user_id = ? OR
                to_user_id = ?
            ORDER BY sequence ASC
        `);
        this.#countTransactions = database.prepare(`
            SELECT COUNT(*) AS count
            FROM economy_transactions
        `);
        this.#countUserTransactions = database.prepare(`
            SELECT COUNT(*) AS count
            FROM economy_transactions
            WHERE
                user_id = ? OR
                from_user_id = ? OR
                to_user_id = ?
        `);
        this.#pageTransactions = database.prepare(`
            SELECT
                sequence,
                type,
                amount,
                user_id AS userId,
                from_user_id AS fromUserId,
                to_user_id AS toUserId,
                balance_after AS balanceAfter,
                from_balance_after AS fromBalanceAfter,
                to_balance_after AS toBalanceAfter,
                reason,
                created_at AS createdAt
            FROM economy_transactions
            ORDER BY created_at DESC, sequence DESC
            LIMIT ? OFFSET ?
        `);
        this.#pageUserTransactions = database.prepare(`
            SELECT
                sequence,
                type,
                amount,
                user_id AS userId,
                from_user_id AS fromUserId,
                to_user_id AS toUserId,
                balance_after AS balanceAfter,
                from_balance_after AS fromBalanceAfter,
                to_balance_after AS toBalanceAfter,
                reason,
                created_at AS createdAt
            FROM economy_transactions
            WHERE
                user_id = ? OR
                from_user_id = ? OR
                to_user_id = ?
            ORDER BY created_at DESC, sequence DESC
            LIMIT ? OFFSET ?
        `);
        this.#leaderboard = database.prepare(`
            SELECT
                user_id AS userId,
                balance
            FROM economy_accounts
            ORDER BY balance DESC, user_id ASC
            LIMIT ?
        `);

    }

    hasAccount(userId) {
        return this.#selectAccount.get(userId) !== undefined;
    }

    createAccount(account) {

        return this.runTransaction(() => {

            if (this.#selectAccount.get(account.userId)) {
                throw new Error(
                    `Economy account already exists: ${account.userId}`
                );
            }

            this.insertAccount(account);

            return this.#selectAccount.get(account.userId);

        });

    }

    ensureAccount(account) {

        const existingAccount =
            this.#selectAccount.get(account.userId);

        if (existingAccount) {
            return existingAccount;
        }

        return this.runTransaction(() => {

            const currentAccount =
                this.#selectAccount.get(account.userId);

            if (currentAccount) {
                return currentAccount;
            }

            this.insertAccount(account);

            return this.#selectAccount.get(account.userId);

        });

    }

    getAccount(userId) {
        return this.#selectAccount.get(userId) || null;
    }

    listAccounts() {
        return this.#listAccounts.all();
    }

    countAccounts() {
        return this.#countAccounts.get().count;
    }

    getLastDailyClaim(userId) {

        const row = this.#selectDailyClaim.get(userId);

        return row ? row.claimedAt : null;

    }

    listDailyClaims() {
        return this.#listDailyClaims.all();
    }

    commitBalanceTransaction({
        expectedAccount,
        account,
        transaction
    }) {

        return this.runTransaction(() => {

            this.requireExpectedAccount(
                account.userId,
                expectedAccount
            );
            this.persistAccount(
                expectedAccount,
                account
            );

            return this.insertTransaction(transaction);

        });

    }

    commitTransfer({
        expectedSource,
        expectedDestination,
        sourceAccount,
        destinationAccount,
        transaction
    }) {

        return this.runTransaction(() => {

            this.requireExpectedAccount(
                sourceAccount.userId,
                expectedSource
            );
            this.requireExpectedAccount(
                destinationAccount.userId,
                expectedDestination
            );
            this.persistAccount(
                expectedSource,
                sourceAccount
            );
            this.persistAccount(
                expectedDestination,
                destinationAccount
            );

            return this.insertTransaction(transaction);

        });

    }

    commitDailyClaim({
        expectedAccount,
        expectedClaimedAt,
        account,
        claimedAt,
        transaction
    }) {

        return this.runTransaction(() => {

            this.requireExpectedAccount(
                account.userId,
                expectedAccount
            );

            const currentClaimedAt =
                this.getLastDailyClaim(account.userId);

            if (currentClaimedAt !== expectedClaimedAt) {
                throw new Error(
                    "Economy state changed; retry the operation."
                );
            }

            this.persistAccount(
                expectedAccount,
                account
            );

            if (expectedClaimedAt === null) {
                this.#insertDailyClaim.run(
                    account.userId,
                    claimedAt
                );
            } else {
                this.#updateDailyClaim.run(
                    claimedAt,
                    account.userId
                );
            }

            return this.insertTransaction(transaction);

        });

    }

    listTransactions() {
        return this.#listTransactions.all().map(
            row => this.mapTransaction(row)
        );
    }

    listTransactionsForUser(userId) {
        return this.#listUserTransactions.all(
            userId,
            userId,
            userId
        ).map(row => this.mapTransaction(row));
    }

    countTransactions() {
        return this.#countTransactions.get().count;
    }

    getTransactionPage({
        userId,
        page,
        pageSize
    }) {

        const offset = (page - 1) * pageSize;
        let rows;
        let totalItems;

        if (userId === undefined) {
            rows = this.#pageTransactions.all(
                pageSize,
                offset
            );
            totalItems =
                this.#countTransactions.get().count;
        } else {
            rows = this.#pageUserTransactions.all(
                userId,
                userId,
                userId,
                pageSize,
                offset
            );
            totalItems = this.#countUserTransactions.get(
                userId,
                userId,
                userId
            ).count;
        }

        return {
            items: rows.map(
                row => this.mapTransaction(row)
            ),
            totalItems
        };

    }

    getLeaderboard(limit) {
        return this.#leaderboard.all(limit);
    }

    requireExpectedAccount(userId, expectedAccount) {

        const currentAccount =
            this.#selectAccount.get(userId) || null;

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

    persistAccount(expectedAccount, account) {

        if (expectedAccount === null) {
            this.insertAccount(account);
            return;
        }

        const result = this.#updateAccount.run(
            account.balance,
            account.createdAt,
            account.userId
        );

        if (result.changes !== 1) {
            throw new Error(
                "Economy state changed; retry the operation."
            );
        }

    }

    insertAccount(account) {
        this.#insertAccount.run(
            account.userId,
            account.balance,
            account.createdAt
        );
    }

    insertTransaction(transaction) {

        const result = this.#insertTransaction.run(
            transaction.type,
            transaction.amount,
            transaction.userId,
            transaction.fromUserId,
            transaction.toUserId,
            transaction.balanceAfter,
            transaction.fromBalanceAfter,
            transaction.toBalanceAfter,
            transaction.reason,
            transaction.createdAt
        );
        const sequence = Number(result.lastInsertRowid);

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

        return {
            id: `economy-${sequence}`,
            ...transaction
        };

    }

    mapTransaction(row) {

        const sequence = Number(row.sequence);

        if (
            !Number.isSafeInteger(sequence) ||
            sequence <= 0 ||
            sequence >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                "Stored economy transaction sequence is invalid."
            );
        }

        return {
            id: `economy-${sequence}`,
            type: row.type,
            amount: row.amount,
            userId: row.userId,
            fromUserId: row.fromUserId,
            toUserId: row.toUserId,
            balanceAfter: row.balanceAfter,
            fromBalanceAfter: row.fromBalanceAfter,
            toBalanceAfter: row.toBalanceAfter,
            reason: row.reason,
            createdAt: row.createdAt
        };

    }

    runTransaction(operation) {

        this.#database.exec("BEGIN IMMEDIATE");

        try {

            const result = operation();

            this.#database.exec("COMMIT");

            return result;

        } catch (error) {

            try {
                this.#database.exec("ROLLBACK");
            } catch (rollbackError) {
                throw new Error(
                    "Economy storage rollback failed."
                );
            }

            if (
                error.message.startsWith("Economy ") ||
                error.message.startsWith("Stored economy ")
            ) {
                throw error;
            }

            throw new Error("Economy storage failed.");

        }

    }

}

module.exports = SqliteEconomyStore;
