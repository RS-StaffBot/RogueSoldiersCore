class SevenDaysToDieSingleCommandLifecycle {

    constructor({
        clearCommandTimeout = clearTimeout,
        isReady,
        setCommandTimeout = (callback, delay) =>
            setTimeout(callback, delay),
        write
    } = {}) {

        if (typeof isReady !== "function") {
            throw new Error(
                "7 Days to Die command readiness check must be a function."
            );
        }

        if (typeof write !== "function") {
            throw new Error(
                "7 Days to Die command writer must be a function."
            );
        }

        if (
            typeof setCommandTimeout !== "function" ||
            typeof clearCommandTimeout !== "function"
        ) {
            throw new Error(
                "7 Days to Die command timer operations must be functions."
            );
        }

        this.clearCommandTimeout = clearCommandTimeout;
        this.isReady = isReady;
        this.setCommandTimeout = setCommandTimeout;
        this.write = write;
        this.activeCommand = null;

    }

    execute(command, {
        completionDecider,
        timeoutMs
    } = {}) {

        this.validateExecution(command, completionDecider, timeoutMs);

        if (!this.isReady()) {
            return Promise.reject(new Error(
                "7 Days to Die client must be ready before command execution."
            ));
        }

        if (this.activeCommand !== null) {
            return Promise.reject(new Error(
                "7 Days to Die already has a command in progress."
            ));
        }

        return new Promise((resolve, reject) => {

            const activeCommand = {
                command,
                completionDecider,
                lines: [],
                reject,
                resolve,
                settled: false,
                timer: null
            };

            this.activeCommand = activeCommand;

            activeCommand.timer = this.setCommandTimeout(
                () => this.failActiveCommand(
                    new Error("7 Days to Die command timed out.")
                ),
                timeoutMs
            );

            try {
                this.write(`${command}\r\n`);
            } catch {
                this.failActiveCommand(new Error(
                    "7 Days to Die command write failed."
                ));
            }

        });

    }

    acceptLines(lines) {

        if (!Array.isArray(lines) || lines.some(
            line => typeof line !== "string"
        )) {
            throw new Error(
                "7 Days to Die command lines must be an array of strings."
            );
        }

        const activeCommand = this.activeCommand;

        if (activeCommand === null) {
            return Object.freeze([...lines]);
        }

        const unconsumedLines = [];

        for (const line of lines) {
            if (this.activeCommand !== activeCommand) {
                unconsumedLines.push(line);
                continue;
            }

            activeCommand.lines.push(line);

            let decision;

            try {
                decision = activeCommand.completionDecider({
                    command: activeCommand.command,
                    latestLine: line,
                    lines: Object.freeze([...activeCommand.lines])
                });
            } catch {
                this.failActiveCommand(new Error(
                    "7 Days to Die command completion decision failed."
                ));
                continue;
            }

            if (
                decision &&
                typeof decision === "object" &&
                decision.completed === true
            ) {
                this.completeActiveCommand(
                    Object.hasOwn(decision, "result")
                        ? decision.result
                        : Object.freeze([...activeCommand.lines])
                );
            }
        }

        return Object.freeze(unconsumedLines);

    }

    handleDisconnect(error = null) {

        if (this.activeCommand === null) {
            return;
        }

        this.failActiveCommand(
            error instanceof Error
                ? error
                : new Error(
                    "7 Days to Die disconnected during command execution."
                )
        );

    }

    hasActiveCommand() {
        return this.activeCommand !== null;
    }

    completeActiveCommand(result) {

        const activeCommand = this.detachActiveCommand();

        if (activeCommand === null) {
            return;
        }

        activeCommand.resolve(result);

    }

    failActiveCommand(error) {

        const activeCommand = this.detachActiveCommand();

        if (activeCommand === null) {
            return;
        }

        activeCommand.reject(error);

    }

    detachActiveCommand() {

        const activeCommand = this.activeCommand;

        if (activeCommand === null || activeCommand.settled) {
            return null;
        }

        activeCommand.settled = true;
        this.activeCommand = null;

        if (activeCommand.timer !== null) {
            this.clearCommandTimeout(activeCommand.timer);
            activeCommand.timer = null;
        }

        return activeCommand;

    }

    validateExecution(command, completionDecider, timeoutMs) {

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

        if (typeof completionDecider !== "function") {
            throw new Error(
                "7 Days to Die command completion decider must be a function."
            );
        }

        if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
            throw new Error(
                "7 Days to Die command timeout must be a positive safe integer."
            );
        }

    }

}

module.exports = SevenDaysToDieSingleCommandLifecycle;
