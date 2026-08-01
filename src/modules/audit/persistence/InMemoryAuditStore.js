class InMemoryAuditStore {

    constructor() {
        this.records = [];
        this.nextRecordSequence = 1;
    }

    append(record) {

        const sequence = this.nextRecordSequence;

        if (
            !Number.isSafeInteger(sequence) ||
            sequence <= 0 ||
            sequence >= Number.MAX_SAFE_INTEGER
        ) {
            throw new Error(
                "Audit record ID sequence has reached its safe limit."
            );
        }

        const storedRecord = this.copyRecord({
            ...record,
            id: `audit-${sequence}`
        });

        this.records.push(storedRecord);
        this.nextRecordSequence += 1;

        return this.copyRecord(storedRecord);

    }

    getById(id) {

        const record = this.records.find(
            candidate => candidate.id === id
        );

        return record
            ? this.copyRecord(record)
            : null;

    }

    listAll() {
        return this.records.map(
            record => this.copyRecord(record)
        );
    }

    listRecent(limit) {
        return this.records
            .slice(-limit)
            .reverse()
            .map(record => this.copyRecord(record));
    }

    count() {
        return this.records.length;
    }

    copyRecord(record) {
        return {
            id: record.id,
            actorType: record.actorType,
            actorId: record.actorId,
            source: record.source,
            action: record.action,
            targetType: record.targetType,
            targetId: record.targetId,
            outcome: record.outcome,
            metadata: {
                ...record.metadata
            },
            createdAt: record.createdAt
        };
    }

}

module.exports = InMemoryAuditStore;
