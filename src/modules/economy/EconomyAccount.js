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

}

module.exports = EconomyAccount;