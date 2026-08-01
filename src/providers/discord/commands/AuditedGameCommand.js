const GameCommand = require("./GameCommand");

const AUDITABLE_ACTIONS = Object.freeze({
    ban: "ban",
    kick: "kick",
    unban: "unban",
    "whitelist:add": "whitelist-add",
    "whitelist:remove": "whitelist-remove"
});

class AuditedGameCommand extends GameCommand {

    constructor({ auditService = null, ...options } = {}) {
        super(options);

        if (
            auditService !== null &&
            typeof auditService.recordAttempt !== "function"
        ) {
            throw new Error(
                "Discord hosted-player audit boundary is invalid."
            );
        }

        this.auditService = auditService;
    }

    async execute(interaction) {
        const context = this.createAuditContext(interaction);

        if (!context || !this.auditService) {
            await super.execute(interaction);
            return;
        }

        let responseContent = null;
        const auditedInteraction = this.createInteractionProxy(
            interaction,
            content => {
                responseContent = content;
            }
        );

        try {
            await super.execute(auditedInteraction);
        } catch (error) {
            this.recordAudit(context, {
                outcome: "FAILED",
                status: "execution-failed"
            });
            throw error;
        }

        this.recordAudit(
            context,
            this.classifyResponse(responseContent)
        );
    }

    createAuditContext(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand(true);
            const group =
                typeof interaction.options.getSubcommandGroup === "function"
                    ? interaction.options.getSubcommandGroup(false)
                    : null;
            const key = group ? `${group}:${subcommand}` : subcommand;
            const action = AUDITABLE_ACTIONS[key];

            if (!action) {
                return null;
            }

            return Object.freeze({
                action,
                actorId: interaction.user?.id,
                targetId: this.resolveTargetId(
                    interaction,
                    action
                )
            });
        } catch {
            return null;
        }
    }

    resolveTargetId(interaction, action) {
        if (action === "kick") {
            return interaction.options.getString("entity-id", true);
        }

        if (
            action === "ban" ||
            action === "whitelist-add" ||
            action === "whitelist-remove"
        ) {
            return interaction.options.getString("user-id", true);
        }

        return interaction.options.getString("display-name", true);
    }

    createInteractionProxy(interaction, captureContent) {
        return new Proxy(interaction, {
            get(target, property) {
                if (
                    property === "reply" ||
                    property === "editReply"
                ) {
                    return async payload => {
                        const content =
                            typeof payload === "string"
                                ? payload
                                : payload?.content;

                        if (typeof content === "string") {
                            captureContent(content);
                        }

                        return target[property](payload);
                    };
                }

                const value = target[property];
                return typeof value === "function"
                    ? value.bind(target)
                    : value;
            }
        });
    }

    classifyResponse(content) {
        if (
            content ===
            "You do not have permission to manage the game server."
        ) {
            return Object.freeze({
                outcome: "DENIED",
                status: "permission-denied"
            });
        }

        if (this.isSuccessResponse(content)) {
            return Object.freeze({
                outcome: "SUCCESS",
                status: "succeeded"
            });
        }

        if (
            typeof content === "string" &&
            content.includes("server control is")
        ) {
            return Object.freeze({
                outcome: "FAILED",
                status: "provider-unavailable"
            });
        }

        return Object.freeze({
            outcome: "FAILED",
            status: "command-failed"
        });
    }

    isSuccessResponse(content) {
        return Boolean(
            typeof content === "string" &&
            (
                /^Kicked .+ from the game server\.$/u.test(content) ||
                /^Banned .+ from the game server for \d+ (?:minutes|hours|days|weeks|months|years)\.$/u.test(content) ||
                /^Unbanned .+ from the game server\.$/u.test(content) ||
                /^Added .+ to the game server whitelist\.$/u.test(content) ||
                /^Removed .+ from the game server whitelist\.$/u.test(content)
            )
        );
    }

    recordAudit(context, details) {
        try {
            this.auditService.recordAttempt({
                ...context,
                ...details
            });
        } catch {
            // Audit failure must not change hosted-player administration.
        }
    }

}

module.exports = AuditedGameCommand;
