class CommandRegistry {

    constructor() {

        this.commands = new Map();

    }

    register(command) {

        this.commands.set(command.name, command);

    }

    get(name) {

        return this.commands.get(name);

    }

    getAll() {

        return [...this.commands.values()];

    }

    has(name) {

        return this.commands.has(name);

    }

}

module.exports = new CommandRegistry();