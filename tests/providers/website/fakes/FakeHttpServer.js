const EventEmitter = require("node:events");

class FakeHttpServer extends EventEmitter {

    constructor({
        autoClose = true,
        autoListen = true,
        listenError = null,
        requestListener = null,
        serverOptions = null
    } = {}) {

        super();

        this.autoClose = autoClose;
        this.autoListen = autoListen;
        this.listenError = listenError;
        this.requestListener = requestListener;
        this.serverOptions = serverOptions;
        this.listenCalls = [];
        this.closeCount = 0;
        this.closeAllConnectionsCount = 0;
        this.pendingCloseCallback = null;

    }

    listen(options) {

        this.listenCalls.push(options);

        if (this.autoListen) {

            queueMicrotask(() => {

                if (this.listenError) {
                    this.emit("error", this.listenError);
                } else {
                    this.emit("listening");
                }

            });

        }

    }

    close(callback) {

        this.closeCount += 1;
        this.pendingCloseCallback = callback;

        if (this.autoClose) {
            queueMicrotask(() => {
                this.finishClose();
            });
        }

    }

    closeAllConnections() {

        this.closeAllConnectionsCount += 1;
        this.finishClose();

    }

    finishClose(error = null) {

        const callback = this.pendingCloseCallback;

        this.pendingCloseCallback = null;
        this.emit("close");

        if (callback) {
            callback(error);
        }

    }

    reportListening() {
        this.emit("listening");
    }

    reportError(error = new Error("HTTP server error.")) {
        this.emit("error", error);
    }

    reportUnexpectedClose() {
        this.emit("close");
    }

    request({
        method = "GET",
        url = "/health"
    } = {}) {

        const response = {
            body: "",
            headers: {},
            statusCode: null,
            end(body = "") {
                this.body += body;
            },
            writeHead(statusCode, headers) {
                this.statusCode = statusCode;

                for (const [name, value] of Object.entries(
                    headers
                )) {
                    this.headers[name.toLowerCase()] = value;
                }

            }
        };

        this.requestListener(
            {
                method,
                url
            },
            response
        );

        return response;

    }

}

module.exports = FakeHttpServer;
