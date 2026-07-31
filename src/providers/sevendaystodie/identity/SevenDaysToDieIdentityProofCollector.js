const SevenDaysToDieIdentityProofChatParser = require(
    "./SevenDaysToDieIdentityProofChatParser"
);
const SevenDaysToDieTelnetLineFramer = require(
    "../SevenDaysToDieTelnetLineFramer"
);

class SevenDaysToDieIdentityProofCollector {

    constructor({
        client,
        clearTimer = clearTimeout,
        clock = () => Date.now(),
        parser = new SevenDaysToDieIdentityProofChatParser(),
        setTimer = (callback, delay) => setTimeout(callback, delay),
        timeoutMs = 5 * 60 * 1000
    } = {}) {

        if (!client || typeof client !== "object") {
            throw new Error(
                "7 Days to Die identity proof collector client is required."
            );
        }

        if (
            !parser ||
            typeof parser.parse !== "function" ||
            typeof clearTimer !== "function" ||
            typeof clock !== "function" ||
            typeof setTimer !== "function" ||
            !Number.isSafeInteger(timeoutMs) ||
            timeoutMs <= 0
        ) {
            throw new Error(
                "7 Days to Die identity proof collector dependencies are invalid."
            );
        }

        this.client = client;
        this.clearTimer = clearTimer;
        this.clock = clock;
        this.parser = parser;
        this.setTimer = setTimer;
        this.timeoutMs = timeoutMs;
        this.activeCollection = null;

    }

    isCollecting() {
        return this.activeCollection !== null;
    }

    collect({
        challenge,
        gameUserId
    } = {}) {

        this.validateGameUserId(gameUserId);
        this.parser.validateChallenge(challenge);

        if (this.isCollecting()) {
            return Promise.reject(new Error(
                "7 Days to Die identity proof collection is already active."
            ));
        }

        if (!this.client.ready || !this.client.socket) {
            return Promise.reject(new Error(
                "7 Days to Die client must be ready before identity proof collection."
            ));
        }

        return new Promise(resolve => {

            const active = {
                challenge,
                framer: new SevenDaysToDieTelnetLineFramer(),
                gameUserId,
                listeners: null,
                resolve,
                settled: false,
                socket: this.client.socket,
                timer: null
            };

            const onData = chunk => this.handleData(active, chunk);
            const onClose = () => this.finish(active, []);
            const onError = () => this.finish(active, []);

            active.socket.on("data", onData);
            active.socket.once("close", onClose);
            active.socket.once("error", onError);
            active.listeners = { onClose, onData, onError };
            active.timer = this.setTimer(
                () => this.finish(active, []),
                this.timeoutMs
            );

            this.activeCollection = active;

        });

    }

    handleData(active, chunk) {

        if (this.activeCollection !== active || active.settled) {
            return;
        }

        let lines;

        try {
            lines = active.framer.push(chunk);
        } catch {
            this.finish(active, []);
            return;
        }

        for (const line of lines) {

            let evidence;

            try {
                evidence = this.parser.parse(line, {
                    challenge: active.challenge,
                    observedAt: this.clock()
                });
            } catch {
                this.finish(active, []);
                return;
            }

            if (
                evidence &&
                evidence.gameUserId === active.gameUserId
            ) {
                this.finish(active, [evidence]);
                return;
            }

        }

    }

    finish(active, evidence) {

        if (
            this.activeCollection !== active ||
            active.settled
        ) {
            return;
        }

        active.settled = true;
        this.activeCollection = null;

        if (active.timer !== null) {
            this.clearTimer(active.timer);
        }

        if (active.listeners) {
            active.socket.removeListener("data", active.listeners.onData);
            active.socket.removeListener("close", active.listeners.onClose);
            active.socket.removeListener("error", active.listeners.onError);
        }

        active.resolve(Object.freeze([...evidence]));

    }

    validateGameUserId(gameUserId) {

        if (
            typeof gameUserId !== "string" ||
            !/^(?:Steam_|EOS_)[A-Za-z0-9]+$/u.test(gameUserId)
        ) {
            throw new Error(
                "A supported durable game user ID is required."
            );
        }

    }

}

module.exports = SevenDaysToDieIdentityProofCollector;
