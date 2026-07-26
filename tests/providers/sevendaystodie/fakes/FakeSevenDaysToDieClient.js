class FakeSevenDaysToDieClient {

    constructor({
        connect = null,
        disconnect = null
    } = {}) {

        this.connectImplementation = connect;
        this.disconnectImplementation = disconnect;
        this.connectCalls = [];
        this.disconnectCount = 0;

    }

    async connect(options) {

        this.connectCalls.push(options);

        if (this.connectImplementation) {
            return this.connectImplementation(options);
        }

        return undefined;

    }

    async disconnect() {

        this.disconnectCount += 1;

        if (this.disconnectImplementation) {
            return this.disconnectImplementation();
        }

        return undefined;

    }

}

module.exports = FakeSevenDaysToDieClient;
