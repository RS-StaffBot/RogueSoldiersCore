const SevenDaysToDieCommandCompletionRules = require(
    "./SevenDaysToDieCommandCompletionRules"
);
const SevenDaysToDieCommandFailureResultFactory = require(
    "./SevenDaysToDieCommandFailureResultFactory"
);
const SevenDaysToDieCommandFailureType = require(
    "./SevenDaysToDieCommandFailureType"
);
const SevenDaysToDieCommandFallbackCompletion = require(
    "./SevenDaysToDieCommandFallbackCompletion"
);
const SevenDaysToDieCommandResult = require(
    "./SevenDaysToDieCommandResult"
);
const SevenDaysToDieCommandStatus = require(
    "./SevenDaysToDieCommandStatus"
);
const SevenDaysToDieConsoleLineClassifier = require(
    "./SevenDaysToDieConsoleLineClassifier"
);
const SevenDaysToDieConsoleLineType = require(
    "./SevenDaysToDieConsoleLineType"
);
const SevenDaysToDieTelnetLineFramer = require(
    "./SevenDaysToDieTelnetLineFramer"
);

const KNOWN_COMMANDS = new Set([
    "gettime",
    "help",
    "listplayers",
    "lp",
    "say"
]);

const STARTUP_BANNER_PATTERNS = [
    /^Server port:\s+\d+$/u,
    /^Max players:\s+\d+$/u,
    /^Game mode:\s+.+$/u,
    /^World:\s+.+$/u,
    /^Game name:\s+.+$/u,
    /^Difficulty:\s+.+$/u,
    /^Press 'help' to get a list of all commands\. Press 'exit' to end session\.$/u
];

class SevenDaysToDieCommandService {

    constructor({
        client,
        clearTimer = clearTimeout,
        clock = () => new Date(),
        commandTimeoutMs = 5000,
        inactivityTimeoutMs = 250,
        maximumLines = 10000,
        setTimer = (callback, delay) => setTimeout(callback, delay)
    } = {}) {

        this.validateClient(client);
        this.validatePositiveInteger(commandTimeoutMs, "command timeout");
        this.validatePositiveInteger(inactivityTimeoutMs, "inactivity timeout");
        this.validatePositiveInteger(maximumLines, "maximum line count");

        if (
            typeof clearTimer !== "function" ||
            typeof clock !== "function" ||
            typeof setTimer !== "function"
        ) {
            throw new Error(
                "7 Days to Die command service dependencies are invalid."
            );
        }

        this.client = client;
        this.clearTimer = clearTimer;
        this.clock = clock;
        this.commandTimeoutMs = commandTimeoutMs;
        this.inactivityTimeoutMs = inactivityTimeoutMs;
        this.maximumLines = maximumLines;
        this.setTimer = setTimer;
        this.activeCommand = null;
        this.completionRules = new SevenDaysToDieCommandCompletionRules();
        this.failureFactory = new SevenDaysToDieCommandFailureResultFactory();
        this.fallbackCompletion = new SevenDaysToDieCommandFallbackCompletion();
        this.lineClassifier = new SevenDaysToDieConsoleLineClassifier();

    }

    executeCommand(command, options = {}) {

        this.validateCommand(command);

        if (this.activeCommand !== null) {
            return Promise.reject(new Error(
                "7 Days to Die already has a command in progress."
            ));
        }

        if (!this.client.ready || !this.client.socket) {
            return Promise.reject(new Error(
                "7 Days to Die client must be ready before command execution."
            ));
        }

        const commandTimeoutMs = options.commandTimeoutMs ??
            this.commandTimeoutMs;
        const inactivityTimeoutMs = options.inactivityTimeoutMs ??
            this.inactivityTimeoutMs;

        this.validatePositiveInteger(commandTimeoutMs, "command timeout");
        this.validatePositiveInteger(
            inactivityTimeoutMs,
            "inactivity timeout"
        );

        return new Promise(resolve => {

            const socket = this.client.socket;
            const startedAt = this.clock().toISOString();
            const commandName = command.toLowerCase().split(/\s+/u)[0];
            const active = {
                command,
                commandName,
                completionDecider: this.completionRules.createDecider(command),
                fallbackTracker:
                    this.fallbackCompletion.createTracker(command),
                framer: new SevenDaysToDieTelnetLineFramer(),
                responseLines: [],
                eventLines: [],
                startupBannerActive: false,
                resolve,
                socket,
                startedAt,
                timeoutTimer: null,
                inactivityTimer: null,
                listeners: null,
                settled: false
            };

            this.activeCommand = active;
            this.attachListeners(active);
            active.timeoutTimer = this.setTimer(
                () => this.finishFailure(
                    active,
                    SevenDaysToDieCommandFailureType.TIMEOUT
                ),
                commandTimeoutMs
            );

            try {
                socket.write(`${command}\r\n`);
            } catch {
                this.finishFailure(
                    active,
                    SevenDaysToDieCommandFailureType.WRITE_ERROR
                );
            }

        });

    }

    attachListeners(active) {

        const onData = chunk => this.handleData(active, chunk);
        const onClose = () => this.finishFailure(
            active,
            SevenDaysToDieCommandFailureType.DISCONNECTED
        );
        const onError = () => this.finishFailure(
            active,
            SevenDaysToDieCommandFailureType.DISCONNECTED
        );

        active.socket.on("data", onData);
        active.socket.once("close", onClose);
        active.socket.once("error", onError);
        active.listeners = { onClose, onData, onError };

    }

    handleData(active, chunk) {

        if (this.activeCommand !== active || active.settled) {
            return;
        }

        let lines;

        try {
            lines = active.framer.push(chunk);
        } catch {
            this.finishFailure(
                active,
                SevenDaysToDieCommandFailureType.SIZE_LIMIT
            );
            return;
        }

        for (const line of lines) {
            if (active.settled) {
                break;
            }

            if (this.shouldIgnoreStartupBannerLine(active, line)) {
                continue;
            }

            const lineType = this.lineClassifier.classify(line, {
                command: active.command
            });

            if (lineType === SevenDaysToDieConsoleLineType.EVENT) {
                active.eventLines.push(line);
                continue;
            }

            active.responseLines.push(line);

            if (
                active.responseLines.length + active.eventLines.length >
                this.maximumLines
            ) {
                this.finishFailure(
                    active,
                    SevenDaysToDieCommandFailureType.SIZE_LIMIT
                );
                break;
            }

            try {
                active.fallbackTracker.acceptLine(line);
                const decision = active.completionDecider({ latestLine: line });

                if (decision.completed === true) {
                    this.finishSuccess(active, decision.completionReason);
                    break;
                }
            } catch {
                this.finishFailure(
                    active,
                    SevenDaysToDieCommandFailureType.COMPLETION_ERROR
                );
                break;
            }

            if (!KNOWN_COMMANDS.has(active.commandName)) {
                this.scheduleInactivity(active);
            }
        }

    }

    shouldIgnoreStartupBannerLine(active, line) {

        if (STARTUP_BANNER_PATTERNS.some(pattern => pattern.test(line))) {
            active.startupBannerActive = true;
            return true;
        }

        if (active.startupBannerActive && line.length === 0) {
            return true;
        }

        if (active.startupBannerActive) {
            active.startupBannerActive = false;
        }

        return false;

    }

    scheduleInactivity(active) {

        if (active.inactivityTimer !== null) {
            this.clearTimer(active.inactivityTimer);
        }

        active.inactivityTimer = this.setTimer(() => {
            try {
                const decision =
                    active.fallbackTracker.completeAfterInactivity();

                if (decision.completed === true) {
                    this.finishSuccess(active, decision.completionReason);
                }
            } catch {
                this.finishFailure(
                    active,
                    SevenDaysToDieCommandFailureType.COMPLETION_ERROR
                );
            }
        }, this.inactivityTimeoutMs);

    }

    finishSuccess(active, completionReason) {

        if (!this.detach(active)) {
            return;
        }

        active.resolve(new SevenDaysToDieCommandResult({
            command: active.command,
            status: SevenDaysToDieCommandStatus.SUCCESS,
            responseLines: active.responseLines,
            eventLines: active.eventLines,
            startedAt: active.startedAt,
            completedAt: this.clock().toISOString(),
            completionReason,
            truncated: false
        }));

    }

    finishFailure(active, failureType) {

        if (!this.detach(active)) {
            return;
        }

        active.resolve(this.failureFactory.create({
            command: active.command,
            failureType,
            responseLines: active.responseLines,
            eventLines: active.eventLines,
            startedAt: active.startedAt,
            completedAt: this.clock().toISOString()
        }));

    }

    detach(active) {

        if (this.activeCommand !== active || active.settled) {
            return false;
        }

        active.settled = true;
        this.activeCommand = null;

        if (active.timeoutTimer !== null) {
            this.clearTimer(active.timeoutTimer);
        }
        if (active.inactivityTimer !== null) {
            this.clearTimer(active.inactivityTimer);
        }

        if (active.listeners) {
            active.socket.removeListener("data", active.listeners.onData);
            active.socket.removeListener("close", active.listeners.onClose);
            active.socket.removeListener("error", active.listeners.onError);
        }

        return true;
    }

    validateClient(client) {
        if (!client || typeof client !== "object") {
            throw new Error(
                "7 Days to Die command service client is required."
            );
        }
    }

    validateCommand(command) {
        if (
            typeof command !== "string" ||
            command.length === 0 ||
            command.trim() !== command ||
            /[\r\n]/u.test(command)
        ) {
            throw new Error(
                "7 Days to Die command must be a non-empty single trimmed line."
            );
        }
    }

    validatePositiveInteger(value, fieldName) {
        if (!Number.isSafeInteger(value) || value < 1) {
            throw new Error(
                `7 Days to Die ${fieldName} must be a positive safe integer.`
            );
        }
    }

}

module.exports = SevenDaysToDieCommandService;
