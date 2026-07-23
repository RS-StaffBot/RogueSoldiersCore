const BaseComponent = require("../../core/BaseComponent");

class BaseProvider extends BaseComponent {
    constructor(name) {
        super(name);
    }

    initialize() {
        super.initialize();
    }

    start() {
        super.start();
    }

    stop() {
        super.stop();
    }
}

module.exports = BaseProvider;