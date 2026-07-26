const http = require("node:http");
const WebsiteAuthenticator = require(
    "./WebsiteAuthenticator"
);

class WebsiteServer {

    constructor({
        authenticator = new WebsiteAuthenticator(),
        clearTimer = clearTimeout,
        createServer = (options, requestListener) =>
            http.createServer(options, requestListener),
        setTimer = setTimeout
    } = {}) {

        if (typeof createServer !== "function") {
            throw new Error(
                "Website HTTP server factory must be a function."
            );
        }

        if (
            !authenticator ||
            typeof authenticator.authenticate !== "function"
        ) {
            throw new Error(
                "Website authenticator must provide an authenticate operation."
            );
        }

        this.authenticator = authenticator;
        this.clearTimer = clearTimer;
        this.createServer = createServer;
        this.setTimer = setTimer;
        this.server = null;
        this.starting = false;
        this.ready = false;
        this.stopping = false;
        this.stopPromise = null;
        this.shutdownTimer = null;
        this.shutdownTimeoutMs = null;
        this.unexpectedLossHandler = null;
        this.lossNotified = false;
        this.liveErrorHandler = null;
        this.liveCloseHandler = null;

    }

    async start(
        options,
        unexpectedLossHandler = null
    ) {

        if (this.server || this.starting) {
            throw new Error(
                "Website server is already started."
            );
        }

        const listenOptions =
            this.createListenOptions(options);

        if (
            unexpectedLossHandler !== null &&
            typeof unexpectedLossHandler !== "function"
        ) {
            throw new Error(
                "Website server loss handler must be a function."
            );
        }

        this.starting = true;
        this.ready = false;
        this.stopping = false;
        this.lossNotified = false;
        this.unexpectedLossHandler =
            unexpectedLossHandler;
        this.shutdownTimeoutMs =
            options.shutdownTimeoutMs;

        let server;

        try {
            server = this.createServer(
                {
                    requestTimeout:
                        options.requestTimeoutMs
                },
                this.handleRequest.bind(this)
            );
            this.validateHttpServer(server);
            this.server = server;
        } catch (error) {
            this.resetAfterStartupFailure();
            throw error;
        }

        return new Promise((resolve, reject) => {

            const finishFailure = error => {

                server.removeListener(
                    "listening",
                    finishReady
                );
                server.removeListener(
                    "error",
                    finishFailure
                );
                server.removeListener(
                    "close",
                    finishClosed
                );
                this.resetAfterStartupFailure();

                reject(error);

            };
            const finishClosed = () => {
                finishFailure(
                    new Error(
                        "Website server closed before listening."
                    )
                );
            };
            const finishReady = () => {

                server.removeListener(
                    "error",
                    finishFailure
                );
                server.removeListener(
                    "close",
                    finishClosed
                );

                this.starting = false;
                this.ready = true;
                this.attachLiveListeners(server);

                resolve();

            };

            server.once("listening", finishReady);
            server.once("error", finishFailure);
            server.once("close", finishClosed);

            try {
                server.listen(listenOptions);
            } catch (error) {
                finishFailure(error);
            }

        });

    }

    async stop() {

        if (this.stopPromise) {
            return this.stopPromise;
        }

        if (!this.server) {
            this.resetStoppedState();
            return undefined;
        }

        const server = this.server;

        this.stopping = true;
        this.ready = false;
        this.detachLiveListeners(server);

        this.stopPromise = new Promise(
            (resolve, reject) => {

                let finished = false;

                const finish = error => {

                    if (finished) {
                        return;
                    }

                    finished = true;
                    this.clearShutdownTimer();
                    this.cleanupServer(server);
                    this.resetStoppedState();

                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }

                };

                try {

                    this.shutdownTimer = this.setTimer(
                        () => {

                            try {
                                server.closeAllConnections();
                            } catch (error) {
                                finish(error);
                            }

                        },
                        this.shutdownTimeoutMs
                    );

                    server.close(error => {
                        finish(error || null);
                    });

                } catch (error) {
                    finish(error);
                }

            }
        );

        try {
            return await this.stopPromise;
        } finally {
            this.stopPromise = null;
        }

    }

    createListenOptions(options) {

        if (
            !options ||
            typeof options !== "object" ||
            Array.isArray(options)
        ) {
            throw new Error(
                "Website server options are required."
            );
        }

        if (options.host !== "127.0.0.1") {
            throw new Error(
                "Website server host must equal 127.0.0.1."
            );
        }

        if (
            !Number.isInteger(options.port) ||
            options.port < 0 ||
            options.port > 65535
        ) {
            throw new Error(
                "Website server port must be an integer from 0 through 65535."
            );
        }

        if (
            !Number.isSafeInteger(
                options.requestTimeoutMs
            ) ||
            options.requestTimeoutMs < 1
        ) {
            throw new Error(
                "Website server request timeout must be a positive safe integer."
            );
        }

        if (
            !Number.isSafeInteger(
                options.shutdownTimeoutMs
            ) ||
            options.shutdownTimeoutMs < 1
        ) {
            throw new Error(
                "Website server shutdown timeout must be a positive safe integer."
            );
        }

        return {
            host: options.host,
            port: options.port
        };

    }

    validateHttpServer(server) {

        if (
            !server ||
            typeof server.once !== "function" ||
            typeof server.on !== "function" ||
            typeof server.removeListener !== "function" ||
            typeof server.listen !== "function" ||
            typeof server.close !== "function" ||
            typeof server.closeAllConnections !== "function"
        ) {
            throw new Error(
                "Website HTTP server boundary is invalid."
            );
        }

    }

    attachLiveListeners(server) {

        this.liveErrorHandler = error => {
            this.ready = false;
            this.notifyUnexpectedLoss(
                error instanceof Error
                    ? error
                    : new Error(
                        "Website server emitted an unexpected error."
                    )
            );
        };
        this.liveCloseHandler = () => {

            const shouldNotify =
                !this.stopping &&
                !this.lossNotified;

            this.detachLiveListeners(server);
            this.cleanupServer(server);
            this.server = null;
            this.ready = false;
            this.starting = false;

            if (shouldNotify) {
                this.notifyUnexpectedLoss(
                    new Error(
                        "Website server closed unexpectedly."
                    )
                );
            }

        };

        server.on("error", this.liveErrorHandler);
        server.once("close", this.liveCloseHandler);

    }

    detachLiveListeners(server) {

        if (this.liveErrorHandler) {
            server.removeListener(
                "error",
                this.liveErrorHandler
            );
        }

        if (this.liveCloseHandler) {
            server.removeListener(
                "close",
                this.liveCloseHandler
            );
        }

        this.liveErrorHandler = null;
        this.liveCloseHandler = null;

    }

    notifyUnexpectedLoss(error) {

        if (
            this.stopping ||
            this.lossNotified
        ) {
            return;
        }

        this.lossNotified = true;

        const handler = this.unexpectedLossHandler;

        this.unexpectedLossHandler = null;

        if (handler) {

            try {
                handler(error);
            } catch {
                // Provider callbacks cannot interrupt server cleanup.
            }

        }

    }

    async handleRequest(request, response) {

        if (request.url === "/health") {

            if (request.method !== "GET") {
                this.writeJson(
                    response,
                    405,
                    {
                        error: "Method not allowed."
                    },
                    {
                        Allow: "GET"
                    }
                );

                return;
            }

            this.writeJson(
                response,
                200,
                {
                    service: "website-provider",
                    status: "ok"
                }
            );

            return;
        }

        if (request.url === "/api/me") {

            if (request.method !== "GET") {
                this.writeJson(
                    response,
                    405,
                    {
                        error: "Method not allowed."
                    },
                    {
                        Allow: "GET"
                    }
                );

                return;
            }

            await this.handleIdentityRequest(
                request,
                response
            );

            return;
        }

        this.writeJson(
            response,
            404,
            {
                error: "Not found."
            }
        );

    }

    async handleIdentityRequest(request, response) {

        let identity;

        try {
            identity = await this.authenticator.authenticate(
                request
            );
        } catch {
            this.writeJson(
                response,
                503,
                {
                    error: "Service unavailable."
                }
            );

            return;
        }

        let actor;

        try {
            actor = this.createActorSnapshot(identity);
        } catch {
            actor = null;
        }

        if (actor === null) {
            this.writeJson(
                response,
                401,
                {
                    error: "Authentication required."
                }
            );

            return;
        }

        this.writeJson(
            response,
            200,
            {
                authenticated: true,
                actor: {
                    actorId: actor.actorId,
                    displayName: actor.displayName,
                    permissions: [...actor.permissions]
                }
            }
        );

    }

    createActorSnapshot(identity) {

        if (
            !identity ||
            typeof identity !== "object" ||
            Array.isArray(identity)
        ) {
            return null;
        }

        const actorId = identity.actorId;
        const displayName = identity.displayName;
        const permissions = identity.permissions;

        if (
            typeof actorId !== "string" ||
            actorId.trim().length === 0 ||
            typeof displayName !== "string" ||
            displayName.trim().length === 0 ||
            !Array.isArray(permissions)
        ) {
            return null;
        }

        const normalizedPermissions = [];
        const knownPermissions = new Set();

        for (const permission of permissions) {

            if (
                typeof permission !== "string" ||
                permission.trim().length === 0
            ) {
                return null;
            }

            const normalizedPermission =
                permission.trim();

            if (!knownPermissions.has(normalizedPermission)) {
                knownPermissions.add(normalizedPermission);
                normalizedPermissions.push(
                    normalizedPermission
                );
            }

        }

        return Object.freeze({
            actorId: actorId.trim(),
            displayName: displayName.trim(),
            permissions: Object.freeze(
                normalizedPermissions
            )
        });

    }

    writeJson(
        response,
        statusCode,
        body,
        additionalHeaders = {}
    ) {

        response.writeHead(
            statusCode,
            {
                "Cache-Control": "no-store",
                "Content-Type":
                    "application/json; charset=utf-8",
                "X-Content-Type-Options": "nosniff",
                ...additionalHeaders
            }
        );
        response.end(JSON.stringify(body));

    }

    clearShutdownTimer() {

        if (this.shutdownTimer !== null) {
            this.clearTimer(this.shutdownTimer);
            this.shutdownTimer = null;
        }

    }

    cleanupServer(server) {

        if (this.server === server) {
            this.server = null;
        }

    }

    resetAfterStartupFailure() {

        this.server = null;
        this.starting = false;
        this.ready = false;
        this.stopping = false;
        this.shutdownTimeoutMs = null;
        this.unexpectedLossHandler = null;
        this.lossNotified = false;

    }

    resetStoppedState() {

        this.server = null;
        this.starting = false;
        this.ready = false;
        this.stopping = false;
        this.shutdownTimeoutMs = null;
        this.unexpectedLossHandler = null;
        this.lossNotified = false;
        this.liveErrorHandler = null;
        this.liveCloseHandler = null;
        this.clearShutdownTimer();

    }

}

module.exports = WebsiteServer;
