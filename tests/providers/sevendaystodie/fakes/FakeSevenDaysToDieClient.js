class FakeSevenDaysToDieClient {

    constructor({
        connect = null,
        disconnect = null
    } = {}) {

        this.connectImplementation = connect;
        this.disconnectImplementation = disconnect;
        this.connectCalls = [];
        this.disconnectCount = 0;
        this.unexpectedConnectionLossHandler = null;

    }

    async connect(
        options,
        unexpectedConnectionLossHandler = null
    ) {

        this.connectCalls.push(options);
        this.unexpectedConnectionLossHandler =
            unexpectedConnectionLossHandler;

        if (this.connectImplementation) {
            return this.connectImplementation(
                options,
                unexpectedConnectionLossHandler
            );
        }

        return undefined;

    }

    async disconnect() {

        this.disconnectCount += 1;

        const unexpectedConnectionLossHandler =
            this.unexpectedConnectionLossHandler;

        this.unexpectedConnectionLossHandler = null;

        if (this.disconnectImplementation) {
            return this.disconnectImplementation(
                unexpectedConnectionLossHandler
            );
        }

        return undefined;

    }

    reportUnexpectedConnectionLoss(
        error = new Error(
            "7 Days to Die connection was lost."
        )
    ) {

        if (this.unexpectedConnectionLossHandler) {
            this.unexpectedConnectionLossHandler(error);
        }

    }

}

module.exports = FakeSevenDaysToDieClient;
