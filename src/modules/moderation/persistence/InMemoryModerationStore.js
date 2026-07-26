class InMemoryModerationStore {

    constructor() {
        this.records = [];
    }

    append(record) {

        this.records.push(
            this.createStoredRecord(record)
        );

    }

    list() {

        return this.records.map(record =>
            this.createStoredRecord(record)
        );

    }

    count() {
        return this.records.length;
    }

    createStoredRecord(record) {

        return {
            action: record.action,
            guildId: record.guildId,
            moderatorId: record.moderatorId,
            targetId: record.targetId,
            reason: record.reason,
            details: {
                ...record.details
            },
            createdAt: record.createdAt
        };

    }

}

module.exports = InMemoryModerationStore;
