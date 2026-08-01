class AuditRecordingService {

    constructor({ auditModule }) {
        if (
            !auditModule ||
            typeof auditModule.recordAction !== "function"
        ) {
            throw new Error("Audit recording service requires an Audit Module.");
        }

        this.record = data => {
            try {
                return auditModule.recordAction(data);
            } catch (error) {
                throw new Error("Audit recording failed.");
            }
        };

        Object.freeze(this);
    }

}

module.exports = AuditRecordingService;
