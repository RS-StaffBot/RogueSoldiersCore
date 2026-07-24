class BaseCommand {

    constructor(data) {

        this.data = data;

    }

    async execute() {

        throw new Error("Commands must implement execute().");

    }

}

module.exports = BaseCommand;