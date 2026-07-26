const EconomyMigrations = Object.freeze([
    Object.freeze({
        id: "002_create_economy_ledger",
        sql: `
            CREATE TABLE economy_accounts (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL UNIQUE CHECK (
                    length(trim(user_id)) > 0
                ),
                balance INTEGER NOT NULL CHECK (
                    balance >= 0 AND
                    balance <= 9007199254740991
                ),
                created_at TEXT NOT NULL CHECK (
                    length(trim(created_at)) > 0
                )
            ) STRICT;

            CREATE TABLE economy_transactions (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL CHECK (
                    type IN ('CREDIT', 'DEBIT', 'TRANSFER')
                ),
                amount INTEGER NOT NULL CHECK (
                    amount > 0 AND
                    amount <= 9007199254740991
                ),
                user_id TEXT REFERENCES economy_accounts(user_id),
                from_user_id TEXT REFERENCES economy_accounts(user_id),
                to_user_id TEXT REFERENCES economy_accounts(user_id),
                balance_after INTEGER CHECK (
                    balance_after IS NULL OR (
                        balance_after >= 0 AND
                        balance_after <= 9007199254740991
                    )
                ),
                from_balance_after INTEGER CHECK (
                    from_balance_after IS NULL OR (
                        from_balance_after >= 0 AND
                        from_balance_after <= 9007199254740991
                    )
                ),
                to_balance_after INTEGER CHECK (
                    to_balance_after IS NULL OR (
                        to_balance_after >= 0 AND
                        to_balance_after <= 9007199254740991
                    )
                ),
                reason TEXT NOT NULL CHECK (
                    length(trim(reason)) > 0
                ),
                created_at TEXT NOT NULL CHECK (
                    length(trim(created_at)) > 0
                ),
                CHECK (
                    (
                        type IN ('CREDIT', 'DEBIT') AND
                        user_id IS NOT NULL AND
                        from_user_id IS NULL AND
                        to_user_id IS NULL AND
                        balance_after IS NOT NULL AND
                        from_balance_after IS NULL AND
                        to_balance_after IS NULL
                    ) OR (
                        type = 'TRANSFER' AND
                        user_id IS NULL AND
                        from_user_id IS NOT NULL AND
                        to_user_id IS NOT NULL AND
                        from_user_id <> to_user_id AND
                        balance_after IS NULL AND
                        from_balance_after IS NOT NULL AND
                        to_balance_after IS NOT NULL
                    )
                )
            ) STRICT;

            CREATE TABLE economy_daily_claims (
                user_id TEXT PRIMARY KEY
                    REFERENCES economy_accounts(user_id),
                claimed_at TEXT NOT NULL CHECK (
                    length(trim(claimed_at)) > 0
                )
            ) STRICT;

            CREATE INDEX economy_accounts_leaderboard
            ON economy_accounts(balance DESC, user_id ASC);

            CREATE INDEX economy_transactions_user_history
            ON economy_transactions(
                user_id,
                created_at DESC,
                sequence DESC
            );

            CREATE INDEX economy_transactions_source_history
            ON economy_transactions(
                from_user_id,
                created_at DESC,
                sequence DESC
            );

            CREATE INDEX economy_transactions_destination_history
            ON economy_transactions(
                to_user_id,
                created_at DESC,
                sequence DESC
            )
        `
    })
]);

module.exports = EconomyMigrations;
