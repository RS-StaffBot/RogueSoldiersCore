const net = require("node:net");

const PASSWORD_PROMPT_PATTERN =
    /please enter password:/i;
const AUTHENTICATION_SUCCESS_PATTERN =
    /logon successful\./i;
const CONSOLE_READY_PATTERN =
    /\*\*\* connected with 7dtd server\./i;
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
        this.cancelConnectionAttempt = null;
        this.liveSocketListeners = null;
        this.lastConnectionError = null;

    }

    async connect(options) {

        this.validateConnectionOptions(options);

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
        this.lastConnectionError = null;

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
                    this.passwordSent &&
                    this.authenticationAccepted &&
                    this.consoleReady
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
            this.lastConnectionError = new Error(
                "7 Days to Die connection was lost."
            );
            this.ready = false;
        };
        const onClose = () => {
            this.removeLiveSocketListeners();
            this.socket = null;
            this.ready = false;
        };

        socket.on("error", onError);
        socket.on("close", onClose);

        this.liveSocketListeners = {
            onClose,
            onError,
            socket
        };

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
        this.cancelConnectionAttempt = null;

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
