const net = require("node:net");

const PASSWORD_PROMPT_PATTERN =
    /please enter password:/i;
const AUTHENTICATION_SUCCESS_PATTERN =
    /logon successful\./i;
const CONSOLE_READY_PATTERN =
    /\*\*\* connected with 7dtd server\./i;
const CONSOLE_INSTRUCTION_PATTERN =
    /press 'help' to get a list of all commands\. press 'exit' to end session\./i;
const AUTHENTICATION_REJECTION_PATTERNS = [
    /password incorrect, please enter password:/i,
    /too many failed login attempts!/i
];

class SevenDaysToDieTelnetClient {

    constructor({
        clearConnectionTimeout = clearTimeout,
        createSocket = options =>
            net.createConnection(options),
        setConnectionTimeout = (callback, delay) =>
            setTimeout(callback, delay)
    } = {}) {

        this.clearConnectionTimeout =
            clearConnectionTimeout;
        this.createSocket = createSocket;
        this.setConnectionTimeout =
            setConnectionTimeout;
        this.socket = null;
        this.connectionTimer = null;
        this.connecting = false;
        this.ready = false;
        this.inputBuffer = "";
        this.passwordSent = false;
        this.authenticationAccepted = false;
        this.consoleReady = false;
        this.consoleInstructionsReceived = false;
        this.cancelConnectionAttempt = null;
        this.liveSocketListeners = null;
        this.lastConnectionError = null;
        this.unexpectedConnectionLossHandler = null;
        this.connectionLossNotified = false;

    }

    async connect(
        options,
        unexpectedConnectionLossHandler = null
    ) {

        this.validateConnectionOptions(options);
        this.validateUnexpectedConnectionLossHandler(
            unexpectedConnectionLossHandler
        );

        if (this.connecting || this.socket) {
            throw new Error(
                "7 Days to Die client is already connecting " +
                "or connected."
            );
        }

        this.connecting = true;
        this.ready = false;
        this.inputBuffer = "";
        this.passwordSent = false;
        this.authenticationAccepted = false;
        this.consoleReady = false;
        this.consoleInstructionsReceived = false;
        this.lastConnectionError = null;
        this.unexpectedConnectionLossHandler =
            unexpectedConnectionLossHandler;
        this.connectionLossNotified = false;

        return new Promise((resolve, reject) => {

            let settled = false;
            let attemptListeners = null;

            const clearTimer = () => {

                if (this.connectionTimer !== null) {
                    this.clearConnectionTimeout(
                        this.connectionTimer
                    );
                    this.connectionTimer = null;
                }

            };

            const removeAttemptListeners = () => {

                if (!attemptListeners) {
                    return;
                }

                const {
                    socket,
                    onClose,
                    onData,
                    onError
                } = attemptListeners;

                socket.removeListener("close", onClose);
                socket.removeListener("data", onData);
                socket.removeListener("error", onError);
                attemptListeners = null;

            };

            const fail = message => {

                if (settled) {
                    return;
                }

                settled = true;
                clearTimer();
                removeAttemptListeners();

                const socket = this.socket;

                this.socket = null;
                this.connecting = false;
                this.ready = false;
                this.inputBuffer = "";
                this.cancelConnectionAttempt = null;
                this.unexpectedConnectionLossHandler = null;
                this.connectionLossNotified = false;

                if (socket && !socket.destroyed) {

                    try {
                        socket.destroy();
                    } catch {
                        // The connection error remains authoritative.
                    }

                }

                reject(new Error(message));

            };

            const succeed = () => {

                if (settled) {
                    return;
                }

                settled = true;
                clearTimer();
                removeAttemptListeners();

                this.connecting = false;
                this.ready = true;
                this.inputBuffer = "";
                this.cancelConnectionAttempt = null;

                this.attachLiveSocketListeners(
                    this.socket
                );

                resolve();

            };

            const onData = chunk => {

                this.inputBuffer +=
                    this.convertChunkToText(chunk);

                if (
                    AUTHENTICATION_REJECTION_PATTERNS.some(
                        pattern =>
                            pattern.test(this.inputBuffer)
                    )
                ) {
                    fail(
                        "7 Days to Die authentication was rejected."
                    );
                    return;
                }

                if (
                    !this.passwordSent &&
                    PASSWORD_PROMPT_PATTERN.test(
                        this.inputBuffer
                    )
                ) {

                    try {
                        this.socket.write(
                            `${options.password}\r\n`
                        );
                        this.passwordSent = true;
                    } catch {
                        fail(
                            "7 Days to Die authentication write failed."
                        );
                        return;
                    }

                }

                if (
                    AUTHENTICATION_SUCCESS_PATTERN.test(
                        this.inputBuffer
                    )
                ) {
                    this.authenticationAccepted = true;
                }

                if (
                    CONSOLE_READY_PATTERN.test(
                        this.inputBuffer
                    )
                ) {
                    this.consoleReady = true;
                }

                if (
                    CONSOLE_INSTRUCTION_PATTERN.test(
                        this.inputBuffer
                    )
                ) {
                    this.consoleInstructionsReceived = true;
                }

                const authenticatedConsoleReady =
                    this.passwordSent &&
                    this.authenticationAccepted &&
                    this.consoleReady;
                const directConsoleReady =
                    !this.passwordSent &&
                    this.consoleReady &&
                    this.consoleInstructionsReceived;

                if (
                    authenticatedConsoleReady ||
                    directConsoleReady
                ) {
                    succeed();
                }

            };

            const onError = () => {
                fail("7 Days to Die connection failed.");
            };

            const onClose = () => {
                fail(
                    "7 Days to Die connection closed before readiness."
                );
            };

            this.cancelConnectionAttempt = () => {
                fail(
                    "7 Days to Die connection closed before readiness."
                );
            };

            try {

                const socket = this.createSocket({
                    host: options.host,
                    port: options.port
                });

                this.validateSocket(socket);
                this.socket = socket;
                attemptListeners = {
                    onClose,
                    onData,
                    onError,
                    socket
                };

                socket.on("close", onClose);
                socket.on("data", onData);
                socket.on("error", onError);

                this.connectionTimer =
                    this.setConnectionTimeout(
                        () => {
                            fail(
                                "7 Days to Die connection timed " +
                                "out before readiness."
                            );
                        },
                        options.connectionTimeoutMs
                    );

            } catch {
                fail("7 Days to Die connection failed.");
            }

        });

    }

    async disconnect() {

        if (this.connecting && this.cancelConnectionAttempt) {
            this.cancelConnectionAttempt();
            return;
        }

        const socket = this.socket;

        if (!socket) {
            this.resetDisconnectedState();
            return;
        }

        this.removeLiveSocketListeners();

        if (socket.closed) {
            this.resetDisconnectedState();
            return;
        }

        await new Promise((resolve, reject) => {

            let settled = false;

            const cleanup = () => {
                socket.removeListener("close", onClose);
                socket.removeListener("error", onError);
            };

            const onClose = () => {

                if (settled) {
                    return;
                }

                settled = true;
                cleanup();
                resolve();

            };

            const onError = () => {

                if (settled) {
                    return;
                }

                settled = true;
                cleanup();
                reject(
                    new Error(
                        "7 Days to Die disconnection failed."
                    )
                );

            };

            socket.once("close", onClose);
            socket.once("error", onError);

            if (!socket.destroyed) {

                try {
                    socket.destroy();
                } catch {
                    onError();
                }

            }

        });

        this.resetDisconnectedState();

    }

    attachLiveSocketListeners(socket) {

        const onError = () => {

            if (!this.ready) {
                return;
            }

            const error = new Error(
                "7 Days to Die connection was lost."
            );
            this.lastConnectionError = error;
            this.ready = false;

            this.notifyUnexpectedConnectionLoss(error);

        };
        const onClose = () => {

            const wasReady = this.ready;

            this.removeLiveSocketListeners();
            this.socket = null;
            this.ready = false;

            if (wasReady) {

                const error = new Error(
                    "7 Days to Die connection closed unexpectedly."
                );
                this.lastConnectionError = error;
                this.notifyUnexpectedConnectionLoss(error);

            }

        };

        socket.on("error", onError);
        socket.on("close", onClose);

        this.liveSocketListeners = {
            onClose,
            onError,
            socket
        };

    }

    notifyUnexpectedConnectionLoss(error) {

        if (this.connectionLossNotified) {
            return;
        }

        this.connectionLossNotified = true;

        const handler =
            this.unexpectedConnectionLossHandler;
        this.unexpectedConnectionLossHandler = null;

        if (!handler) {
            return;
        }

        try {
            handler(error);
        } catch {
            // Socket cleanup remains authoritative if notification fails.
        }

    }

    removeLiveSocketListeners() {

        if (!this.liveSocketListeners) {
            return;
        }

        const {
            onClose,
            onError,
            socket
        } = this.liveSocketListeners;

        socket.removeListener("close", onClose);
        socket.removeListener("error", onError);
        this.liveSocketListeners = null;

    }

    resetDisconnectedState() {

        if (this.connectionTimer !== null) {
            this.clearConnectionTimeout(
                this.connectionTimer
            );
            this.connectionTimer = null;
        }

        this.removeLiveSocketListeners();
        this.socket = null;
        this.connecting = false;
        this.ready = false;
        this.inputBuffer = "";
        this.passwordSent = false;
        this.authenticationAccepted = false;
        this.consoleReady = false;
        this.consoleInstructionsReceived = false;
        this.cancelConnectionAttempt = null;
        this.unexpectedConnectionLossHandler = null;
        this.connectionLossNotified = false;

    }

    validateConnectionOptions(options) {

        if (
            !options ||
            typeof options !== "object" ||
            Array.isArray(options) ||
            typeof options.host !== "string" ||
            options.host.length === 0 ||
            !Number.isInteger(options.port) ||
            options.port < 1 ||
            options.port > 65535 ||
            typeof options.password !== "string" ||
            options.password.length === 0 ||
            !Number.isInteger(options.connectionTimeoutMs) ||
            options.connectionTimeoutMs < 1
        ) {
            throw new Error(
                "7 Days to Die connection options are invalid."
            );
        }

    }

    validateUnexpectedConnectionLossHandler(handler) {

        if (
            handler !== null &&
            typeof handler !== "function"
        ) {
            throw new Error(
                "7 Days to Die connection-loss handler is invalid."
            );
        }

    }

    validateSocket(socket) {

        if (
            !socket ||
            typeof socket.on !== "function" ||
            typeof socket.once !== "function" ||
            typeof socket.removeListener !== "function" ||
            typeof socket.write !== "function" ||
            typeof socket.destroy !== "function"
        ) {
            throw new Error(
                "7 Days to Die socket is invalid."
            );
        }

    }

    convertChunkToText(chunk) {

        if (Buffer.isBuffer(chunk)) {
            return chunk.toString("utf8");
        }

        return String(chunk);

    }

}

module.exports = SevenDaysToDieTelnetClient;
