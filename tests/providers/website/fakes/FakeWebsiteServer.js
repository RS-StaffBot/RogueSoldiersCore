class FakeWebsiteServer {

    constructor({
        start = null,
        stop = null
    } = {}) {

        this.startImplementation = start;
        this.stopImplementation = stop;
        this.startCalls = [];
        this.stopCount = 0;
        this.unexpectedLossHandler = null;

    }

    async start(
        options,
        unexpectedLossHandler = null
    ) {

        this.startCalls.push(options);
        this.unexpectedLossHandler =
            unexpectedLossHandler;

        if (this.startImplementation) {
            return this.startImplementation(
                options,
                unexpectedLossHandler
            );
        }

        return undefined;

    }

    async stop() {

        this.stopCount += 1;

        const unexpectedLossHandler =
            this.unexpectedLossHandler;

        this.unexpectedLossHandler = null;

        if (this.stopImplementation) {
            return this.stopImplementation(
                unexpectedLossHandler
            );
        }

        return undefined;

    }

    reportUnexpectedLoss(
        error = new Error(
            "Website server was lost."
        )
    ) {

        if (this.unexpectedLossHandler) {
            this.unexpectedLossHandler(error);
        }

    }

}

module.exports = FakeWebsiteServer;
