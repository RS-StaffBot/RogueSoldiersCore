const EconomyTransactionType = require(
    "./EconomyTransactionType"
);

class EconomyTransaction {

    constructor({
        id,
        type,
        amount,
        userId = null,
        fromUserId = null,
        toUserId = null,
        balanceAfter = null,
        fromBalanceAfter = null,
        toBalanceAfter = null,
        reason = "No reason provided.",
        createdAt = new Date()
    }) {

        if (
            typeof id !== "string" ||
            id.trim().length === 0
        ) {
            throw new Error(
                "Economy transaction ID is required."
            );
        }

        if (
            !Object.values(EconomyTransactionType)
                .includes(type)
        ) {
            throw new Error(
                `Unsupported economy transaction type: ${type}`
            );
        }

        if (
            typeof amount !== "number" ||
            !Number.isSafeInteger(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Economy transaction amount must be a " +
                "positive safe integer."
            );
        }

        if (
            typeof reason !== "string" ||
            reason.trim().length === 0
        ) {
            throw new Error(
                "Economy transaction reason is required."
            );
        }

        if (
            !(createdAt instanceof Date) ||
            Number.isNaN(createdAt.getTime())
        ) {
            throw new Error(
                "Economy transaction date is invalid."
            );
        }

        this.validateUserId(userId, "user");
        this.validateUserId(fromUserId, "source user");
        this.validateUserId(toUserId, "destination user");

        if (
            type === EconomyTransactionType.CREDIT ||
            type === EconomyTransactionType.DEBIT
        ) {
            if (userId === null) {
                throw new Error(
                    "Economy transaction user ID is required."
                );
            }

            this.validateBalance(
                balanceAfter,
                "balance after"
            );
        }

        if (type === EconomyTransactionType.TRANSFER) {
            if (fromUserId === null) {
                throw new Error(
                    "Economy transaction source user ID is required."
                );
            }

            if (toUserId === null) {
                throw new Error(
                    "Economy transaction destination user ID is required."
                );
            }

            if (fromUserId === toUserId) {
                throw new Error(
                    "Economy transfers require different accounts."
                );
            }

            this.validateBalance(
                fromBalanceAfter,
                "source balance after"
            );
            this.validateBalance(
                toBalanceAfter,
                "destination balance after"
            );
        }

        this.id = id;
        this.type = type;
        this.amount = amount;
        this.userId = userId;
        this.fromUserId = fromUserId;
        this.toUserId = toUserId;
        this.balanceAfter = balanceAfter;
        this.fromBalanceAfter = fromBalanceAfter;
        this.toBalanceAfter = toBalanceAfter;
        this.reason = reason.trim();
        this.createdAt = new Date(createdAt.getTime());

    }

    validateUserId(userId, fieldName) {

        if (
            userId !== null &&
            (
                typeof userId !== "string" ||
                userId.trim().length === 0
            )
        ) {
            throw new Error(
                `Economy transaction ${fieldName} ID is invalid.`
            );
        }

    }

    validateBalance(balance, fieldName) {

        if (
            typeof balance !== "number" ||
            !Number.isSafeInteger(balance) ||
            balance < 0
        ) {
            throw new Error(
                `Economy transaction ${fieldName} must be a ` +
                "non-negative safe integer."
            );
        }

    }

}

module.exports = EconomyTransaction;
