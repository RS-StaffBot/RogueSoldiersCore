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
        this.createdAt = createdAt;

    }

}

module.exports = EconomyTransaction;