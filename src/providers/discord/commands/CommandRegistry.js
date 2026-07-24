class CommandRegistry {

    constructor() {

        this.commands = new Map();

    }

    register(command) {

        this.commands.set(command.data.name, command);

    }

    get(name) {

        return this.commands.get(name);

    }

    list() {

        return [...this.commands.values()];

    }

}

module.exports = new CommandRegistry();