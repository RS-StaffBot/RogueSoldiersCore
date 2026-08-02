const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const BaseCommand = require("./BaseCommand");

const DEFAULT_LIMIT = 5;
const MAXIMUM_LIMIT = 10;
const MAXIMUM_RESPONSE_LENGTH = 1900;

const ALLOWED_ACTOR_TYPES = new Set([
    "discord-user",
    "system",
    "website-user"
]);

const ALLOWED_SOURCES = new Set([
    "discord",
    "framework",
    "website"
]);

const ALLOWED_OUTCOMES = new Set([
    "denied",
    "failed",
    "success"
]);

const ALLOWED_METADATA_FIELDS = Object.freeze([
    "status",
    "referenceId",
    "previousState",
    "currentState"
]);

class AuditCommand extends BaseCommand {

    constructor({
        authorizer,
        logger,
        queryBoundary
    } = {}) {

        if (
            !authorizer ||
            typeof authorizer.getRequiredPermission !== "function" ||
            typeof authorizer.isAuthorized !== "function" ||
            !logger ||
            typeof logger.error !== "function" ||
            !queryBoundary ||
            typeof queryBoundary.getById !== "function" ||
            typeof queryBoundary.list !== "function"
        ) {
            throw new Error(
                "Discord Audit command boundary is invalid."
            );
        }

        super(
            new SlashCommandBuilder()
                .setName("audit")
                .setDescription(
                    "Privately reviews bounded RSF Audit records."
                )
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    authorizer.getRequiredPermission()
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("recent")
                        .setDescription(
                            "Shows recent privacy-safe Audit records."
                        )
                        .addIntegerOption(option =>
                            option
                                .setName("limit")
                                .setDescription(
                                    "Number of records to return."
                                )
                                .setMinValue(1)
                                .setMaxValue(MAXIMUM_LIMIT)
                        )
                        .addStringOption(option =>
                            option
                                .setName("cursor")
                                .setDescription(
                                    "Opaque cursor returned by a previous lookup."
                                )
                                .setMaxLength(128)
                        )
                        .addStringOption(option =>
                            option
                                .setName("actor-type")
                                .setDescription(
                                    "Filters by actor type."
                                )
                                .addChoices(
                                    {
                                        name: "Discord user",
                                        value: "discord-user"
                                    },
                                    {
                                        name: "System",
                                        value: "system"
                                    },
                                    {
                                        name: "Website user",
                                        value: "website-user"
                                    }
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName("source")
                                .setDescription(
                                    "Filters by Audit source."
                                )
                                .addChoices(
                                    {
                                        name: "Discord",
                                        value: "discord"
                                    },
                                    {
                                        name: "Framework",
                                        value: "framework"
                                    },
                                    {
                                        name: "Website",
                                        value: "website"
                                    }
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName("outcome")
                                .setDescription(
                                    "Filters by Audit outcome."
                                )
                                .addChoices(
                                    {
                                        name: "Denied",
                                        value: "denied"
                                    },
                                    {
                                        name: "Failed",
                                        value: "failed"
                                    },
                                    {
                                        name: "Success",
                                        value: "success"
                                    }
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName("action")
                                .setDescription(
                                    "Filters by an exact Audit action."
                                )
                                .setMaxLength(64)
                        )
                        .addStringOption(option =>
                            option
                                .setName("target-type")
                                .setDescription(
                                    "Filters by an exact target type."
                                )
                                .setMaxLength(64)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("record")
                        .setDescription(
                            "Looks up one Audit record by ID."
                        )
                        .addStringOption(option =>
                            option
                                .setName("id")
                                .setDescription(
                                    "Audit record ID, such as audit-12."
                                )
                                .setRequired(true)
                                .setMaxLength(32)
                        )
                )
        );

        this.authorizer = authorizer;
        this.logger = logger;
        this.queryBoundary = queryBoundary;

    }

    async execute(interaction) {

        if (!interaction.guild) {
            await this.reply(
                interaction,
                "This command can only be used in a server."
            );
            return;
        }

        if (!this.isAuthorized(interaction)) {
            await this.reply(
                interaction,
                "You do not have permission to review Audit records."
            );
            return;
        }

        const subcommand =
            interaction.options.getSubcommand(true);

        if (subcommand === "recent") {
            await this.executeRecent(interaction);
            return;
        }

        if (subcommand === "record") {
            await this.executeRecord(interaction);
            return;
        }

        await this.reply(
            interaction,
            "That Audit lookup operation is not supported."
        );

    }

    isAuthorized(interaction) {

        try {
            return this.authorizer.isAuthorized(
                interaction.memberPermissions
            );
        } catch {
            return false;
        }

    }

    async executeRecent(interaction) {

        const query = this.createRecentQuery(interaction);

        if (query === null) {
            await this.reply(
                interaction,
                "Audit lookup input is invalid."
            );
            return;
        }

        try {
            const result = this.queryBoundary.list(query);

            await this.reply(
                interaction,
                this.formatRecentResult(result)
            );
        } catch {
            this.logFailure();

            await this.reply(
                interaction,
                "Audit records could not be retrieved."
            );
        }

    }

    async executeRecord(interaction) {

        const id = interaction.options.getString("id");

        if (
            typeof id !== "string" ||
            !/^audit-[1-9]\d*$/u.test(id)
        ) {
            await this.reply(
                interaction,
                "Audit lookup input is invalid."
            );
            return;
        }

        try {
            const record = this.queryBoundary.getById(id);

            if (record === null) {
                await this.reply(
                    interaction,
                    "No Audit record was found with that ID."
                );
                return;
            }

            await this.reply(
                interaction,
                [
                    "Audit record:",
                    "",
                    this.formatRecord(record)
                ].join("\n")
            );
        } catch {
            this.logFailure();

            await this.reply(
                interaction,
                "Audit records could not be retrieved."
            );
        }

    }

    createRecentQuery(interaction) {

        const limit =
            interaction.options.getInteger("limit") ??
            DEFAULT_LIMIT;
        const cursor =
            interaction.options.getString("cursor");
        const actorType =
            interaction.options.getString("actor-type");
        const source =
            interaction.options.getString("source");
        const outcome =
            interaction.options.getString("outcome");
        const action =
            interaction.options.getString("action");
        const targetType =
            interaction.options.getString("target-type");

        if (
            !Number.isSafeInteger(limit) ||
            limit <= 0 ||
            limit > MAXIMUM_LIMIT ||
            !this.isOptionalBoundedString(cursor, 128) ||
            !this.isOptionalEnum(
                actorType,
                ALLOWED_ACTOR_TYPES
            ) ||
            !this.isOptionalEnum(source, ALLOWED_SOURCES) ||
            !this.isOptionalEnum(outcome, ALLOWED_OUTCOMES) ||
            !this.isOptionalRequiredString(action, 64) ||
            !this.isOptionalRequiredString(targetType, 64)
        ) {
            return null;
        }

        const filters = {};

        if (actorType !== null) {
            filters.actorType = actorType;
        }

        if (source !== null) {
            filters.source = source;
        }

        if (outcome !== null) {
            filters.outcome = outcome;
        }

        if (action !== null) {
            filters.action = action;
        }

        if (targetType !== null) {
            filters.targetType = targetType;
        }

        return {
            limit,
            cursor,
            filters
        };

    }

    isOptionalEnum(value, allowedValues) {
        return (
            value === null ||
            allowedValues.has(value)
        );
    }

    isOptionalBoundedString(value, maximumLength) {
        return (
            value === null ||
            (
                typeof value === "string" &&
                value.length > 0 &&
                value.length <= maximumLength
            )
        );
    }

    isOptionalRequiredString(value, maximumLength) {
        return (
            value === null ||
            (
                typeof value === "string" &&
                value.trim().length > 0 &&
                value.length <= maximumLength
            )
        );
    }

    formatRecentResult(result) {

        if (
            !result ||
            typeof result !== "object" ||
            !Array.isArray(result.records) ||
            (
                result.nextCursor !== null &&
                typeof result.nextCursor !== "string"
            )
        ) {
            throw new Error(
                "Discord Audit query result is invalid."
            );
        }

        if (result.records.length === 0) {
            return "No Audit records matched the requested filters.";
        }

        const sections = [
            `Recent Audit records (${result.records.length}):`
        ];

        for (const record of result.records) {
            const candidate = [
                ...sections,
                "",
                this.formatRecord(record)
            ].join("\n");

            if (candidate.length > MAXIMUM_RESPONSE_LENGTH) {
                sections.push(
                    "",
                    "Additional matching records were omitted to keep the response within Discord limits."
                );
                break;
            }

            sections.push("", this.formatRecord(record));
        }

        if (result.nextCursor !== null) {
            const cursorLine =
                `Next cursor: ${this.safeText(
                    result.nextCursor,
                    128
                )}`;
            const candidate = [
                ...sections,
                "",
                cursorLine
            ].join("\n");

            if (candidate.length <= MAXIMUM_RESPONSE_LENGTH) {
                sections.push("", cursorLine);
            }
        }

        return sections.join("\n");

    }

    formatRecord(record) {

        if (!record || typeof record !== "object") {
            throw new Error(
                "Discord Audit record is invalid."
            );
        }

        const lines = [
            `${this.safeText(record.id, 32)} | ` +
                `${this.formatTimestamp(record.createdAt)}`,
            `Source: ${this.safeText(record.source, 32)}`,
            `Action: ${this.safeText(record.action, 64)}`,
            `Outcome: ${this.safeText(record.outcome, 32)}`,
            "Actor: " +
                `${this.safeText(record.actorType, 64)} ` +
                `[${this.safeText(record.actorId, 128)}]`,
            "Target: " +
                `${this.safeText(record.targetType, 64)} ` +
                `[${this.safeText(record.targetId, 128)}]`
        ];

        const metadata = this.formatMetadata(record.metadata);

        if (metadata.length > 0) {
            lines.push(`Details: ${metadata}`);
        }

        return lines.join("\n");

    }

    formatTimestamp(value) {

        const timestamp = Date.parse(value);

        if (!Number.isFinite(timestamp)) {
            return "unknown time";
        }

        return `<t:${Math.floor(timestamp / 1000)}:f>`;

    }

    formatMetadata(metadata) {

        if (
            !metadata ||
            typeof metadata !== "object" ||
            Array.isArray(metadata)
        ) {
            return "";
        }

        return ALLOWED_METADATA_FIELDS
            .filter(field =>
                Object.prototype.hasOwnProperty.call(
                    metadata,
                    field
                )
            )
            .map(field =>
                `${field}=${this.safeText(
                    metadata[field],
                    128
                )}`
            )
            .join(", ");

    }

    safeText(value, maximumLength) {

        if (typeof value !== "string") {
            return "unknown";
        }

        const sanitized = value
            .replace(/[\u0000-\u001F\u007F]/gu, "")
            .replace(/@/gu, "＠")
            .replace(/</gu, "‹")
            .replace(/>/gu, "›")
            .replace(/`/gu, "'")
            .replace(/\r?\n/gu, " ")
            .trim();

        if (sanitized.length === 0) {
            return "unknown";
        }

        if (sanitized.length <= maximumLength) {
            return sanitized;
        }

        return (
            sanitized.slice(0, maximumLength - 3) +
            "..."
        );

    }

    logFailure() {

        try {
            this.logger.error(
                "Discord Audit lookup failed."
            );
        } catch {
            // Logging failure must not expose internals to Discord.
        }

    }

    reply(interaction, content) {
        return interaction.reply({
            allowedMentions: {
                parse: []
            },
            content,
            flags: MessageFlags.Ephemeral
        });
    }

}

module.exports = AuditCommand;