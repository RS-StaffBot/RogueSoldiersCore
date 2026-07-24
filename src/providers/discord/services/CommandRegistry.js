class CommandRegistry {

    constructor() {

        this.commands = new Map();

    }

    register(command) {

        this.validateCommand(command);

        const commandName = command.data.name;

        if (this.commands.has(commandName)) {

            throw new Error(
                `Discord command '${commandName}' is already registered.`
            );

        }

        this.commands.set(commandName, command);

    }

    get(name) {

        return this.commands.get(name);

    }

    getAll() {

        return [...this.commands.values()];

    }

    getDefinitions() {

        return this.getAll().map(command => {

            return command.data.toJSON();

        });

    }

    has(name) {

        return this.commands.has(name);

    }

    clear() {

        this.commands.clear();

    }

    validateCommand(command) {

        if (!command || typeof command !== "object") {

            throw new TypeError(
                "A Discord command instance is required."
            );

        }

        if (!command.data) {

            throw new TypeError(
                "Discord commands must provide command data."
            );

        }

        if (
            typeof command.data.name !== "string"
            || command.data.name.length === 0
        ) {

            throw new TypeError(
                "Discord commands must provide a valid command name."
            );

        }

        if (typeof command.data.toJSON !== "function") {

            throw new TypeError(
                `Discord command '${command.data.name}' must provide serializable command data.`
            );

        }

        if (typeof command.execute !== "function") {

            throw new TypeError(
                `Discord command '${command.data.name}' must implement execute().`
            );

        }

    }

}

module.exports = new CommandRegistry();