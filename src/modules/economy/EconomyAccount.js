class EconomyAccount {

    constructor({
        userId,
        balance = 0,
        createdAt = new Date()
    }) {

        if (
            typeof userId !== "string" ||
            userId.trim().length === 0
        ) {
            throw new Error(
                "Economy account user ID is required."
            );
        }

        this.validateBalance(balance);

        if (
            !(createdAt instanceof Date) ||
            Number.isNaN(createdAt.getTime())
        ) {
            throw new Error(
                "Economy account creation date is invalid."
            );
        }

        this.userId = userId;
        this.balance = balance;
        this.createdAt = createdAt;

    }

    validateBalance(balance) {

        if (
            typeof balance !== "number" ||
            !Number.isSafeInteger(balance) ||
            balance < 0
        ) {
            throw new Error(
                "Economy account balance must be a " +
                "non-negative safe integer."
            );
        }

    }

    validateAmount(amount) {

        if (
            typeof amount !== "number" ||
            !Number.isSafeInteger(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Economy amount must be a positive safe integer."
            );
        }

    }

    credit(amount) {

        this.validateAmount(amount);

        const newBalance = this.balance + amount;

        if (!Number.isSafeInteger(newBalance)) {
            throw new Error(
                "Economy balance would exceed the safe integer limit."
            );
        }

        this.balance = newBalance;

        return this.balance;

    }

    debit(amount) {

        this.validateAmount(amount);

        if (amount > this.balance) {
            throw new Error(
                `Insufficient economy balance for user: ${this.userId}`
            );
        }

        this.balance -= amount;

        return this.balance;

    }

}

module.exports = EconomyAccount;