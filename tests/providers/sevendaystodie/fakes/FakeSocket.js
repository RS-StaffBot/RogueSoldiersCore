const { EventEmitter } = require("node:events");

class FakeSocket extends EventEmitter {

    constructor({
        autoCloseOnDestroy = true,
        destroy = null,
        write = null
    } = {}) {

        super();

        this.autoCloseOnDestroy = autoCloseOnDestroy;
        this.destroyImplementation = destroy;
        this.writeImplementation = write;
        this.closed = false;
        this.destroyed = false;
        this.destroyCount = 0;
        this.writes = [];

    }

    write(data) {

        this.writes.push(data);

        if (this.writeImplementation) {
            return this.writeImplementation(data);
        }

        return true;

    }

    destroy() {

        this.destroyCount += 1;
        this.destroyed = true;

        if (this.destroyImplementation) {
            this.destroyImplementation();
        }

        if (this.autoCloseOnDestroy) {
            queueMicrotask(() => {
                this.close();
            });
        }

        return this;

    }

    connect() {
        this.emit("connect");
    }

    data(chunk) {
        this.emit("data", chunk);
    }

    fail(error) {
        this.emit("error", error);
    }

    close() {

        if (this.closed) {
            return;
        }

        this.closed = true;
        this.destroyed = true;
        this.emit("close");

    }

}

module.exports = FakeSocket;
