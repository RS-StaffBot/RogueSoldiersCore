const fs = require("fs");
const path = require("path");
const {
    DatabaseSync
} = require("node:sqlite");

const BaseComponent = require("../BaseComponent");
const ComponentState = require("../ComponentState");
const Configuration = require(
    "../../configuration/ConfigurationManager"
);
const DatabaseMigrationManager = require(
    "./DatabaseMigrationManager"
);

class DatabaseService extends BaseComponent {

    #connection;
    #connectionOpen;
    #migrationManager;
    #databaseConfiguration;

    constructor({
        configuration = Configuration,
        createDatabase = (
            location,
            options
        ) => new DatabaseSync(location, options),
        workingDirectory = process.cwd(),
        migrations = []
    } = {}) {

        super("Database");

        this.configuration = configuration;
        this.createDatabase = createDatabase;
        this.workingDirectory = path.resolve(
            workingDirectory
        );
        this.migrations = migrations;
        this.#connection = null;
        this.#connectionOpen = false;
        this.#migrationManager = null;
        this.#databaseConfiguration = null;

    }

    validateConfiguration(configuration) {

        if (
            !configuration ||
            typeof configuration !== "object" ||
            Array.isArray(configuration)
        ) {
            throw new Error(
                "Database configuration is required."
            );
        }

        if (configuration.provider !== "sqlite") {
            throw new Error(
                "Database provider must be sqlite."
            );
        }

        if (
            typeof configuration.filename !== "string" ||
            configuration.filename.trim().length === 0
        ) {
            throw new Error(
                "Database filename is required."
            );
        }

        if (
            typeof configuration.autoMigrate !== "boolean"
        ) {
            throw new Error(
                "Database autoMigrate must be a boolean."
            );
        }

    }

    resolveLocation(filename) {

        if (filename === ":memory:") {
            return filename;
        }

        const normalizedFilename = filename.trim();
        const location = path.isAbsolute(
            normalizedFilename
        )
            ? path.normalize(normalizedFilename)
            : path.resolve(
                this.workingDirectory,
                normalizedFilename
            );

        if (!path.isAbsolute(normalizedFilename)) {

            const relativeLocation = path.relative(
                this.workingDirectory,
                location
            );

            if (
                relativeLocation.startsWith("..") ||
                path.isAbsolute(relativeLocation)
            ) {
                throw new Error(
                    "Relative database paths must remain " +
                    "inside the working directory."
                );
            }

        }

        if (
            ![".db", ".sqlite", ".sqlite3"].includes(
                path.extname(location).toLowerCase()
            )
        ) {
            throw new Error(
                "Database filename must use .db, .sqlite, " +
                "or .sqlite3."
            );
        }

        return location;

    }

    initialize() {

        if (
            this.state === ComponentState.READY ||
            this.state === ComponentState.RUNNING
        ) {
            return this.getStatus();
        }

        this.state = ComponentState.INITIALIZING;

        try {

            const configuration = this.configuration.get(
                "core.database"
            );

            this.validateConfiguration(configuration);

            const location = this.resolveLocation(
                configuration.filename
            );

            if (location !== ":memory:") {
                fs.mkdirSync(
                    path.dirname(location),
                    {
                        recursive: true
                    }
                );
            }

            this.#connection = this.createDatabase(
                location,
                {
                    open: false,
                    readOnly: false,
                    enableForeignKeyConstraints: true,
                    enableDoubleQuotedStringLiterals: false,
                    allowExtension: false
                }
            );
            this.#connection.open();
            this.#connectionOpen = true;
            this.#connection.exec(
                "PRAGMA foreign_keys = ON"
            );

            if (location !== ":memory:") {
                this.#connection.exec(
                    "PRAGMA journal_mode = WAL"
                );
            }

            this.#migrationManager =
                new DatabaseMigrationManager(
                    this.#connection
                );

            if (configuration.autoMigrate) {
                this.#migrationManager.apply(
                    this.migrations
                );
            }

            if (!this.checkHealth()) {
                throw new Error(
                    "Database health check failed."
                );
            }

            this.#databaseConfiguration = Object.freeze({
                provider: configuration.provider,
                autoMigrate: configuration.autoMigrate
            });
            this.state = ComponentState.READY;

            return this.getStatus();

        } catch (error) {

            this.state = ComponentState.ERROR;

            try {
                this.closeConnection();
            } catch (cleanupError) {
                throw new Error(
                    "Database initialization cleanup failed."
                );
            }

            if (
                error.message.startsWith("Database ") ||
                error.message.startsWith("Relative database ")
            ) {
                throw error;
            }

            throw new Error(
                "Database initialization failed."
            );

        }

    }

    start() {

        if (this.state === ComponentState.RUNNING) {
            return this.getStatus();
        }

        if (this.state !== ComponentState.READY) {
            throw new Error(
                "Database must be ready before it can start."
            );
        }

        this.state = ComponentState.STARTING;

        if (!this.checkHealth()) {
            this.state = ComponentState.ERROR;

            throw new Error(
                "Database health check failed during startup."
            );
        }

        this.state = ComponentState.RUNNING;

        return this.getStatus();

    }

    stop() {

        if (this.state === ComponentState.STOPPED) {
            return this.getStatus();
        }

        this.state = ComponentState.STOPPING;

        try {
            this.closeConnection();
        } catch (error) {
            this.state = ComponentState.ERROR;

            throw new Error(
                "Database shutdown failed."
            );
        }

        this.state = ComponentState.STOPPED;

        return this.getStatus();

    }

    closeConnection() {

        if (this.#connection && this.#connectionOpen) {
            this.#connection.close();
        }

        this.#connection = null;
        this.#connectionOpen = false;
        this.#migrationManager = null;
        this.#databaseConfiguration = null;

    }

    checkHealth() {

        if (!this.#connection) {
            return false;
        }

        try {

            const result = this.#connection.prepare(
                "SELECT 1 AS healthy"
            ).get();

            return result.healthy === 1;

        } catch (error) {
            return false;
        }

    }

    listAppliedMigrations() {

        if (!this.#migrationManager) {
            throw new Error(
                "Database is not initialized."
            );
        }

        if (!this.#databaseConfiguration.autoMigrate) {
            throw new Error(
                "Database migrations are disabled."
            );
        }

        return this.#migrationManager.listApplied();

    }

    createStore(StoreClass) {

        if (
            this.state !== ComponentState.READY &&
            this.state !== ComponentState.RUNNING
        ) {
            throw new Error(
                "Database must be ready before creating a store."
            );
        }

        if (typeof StoreClass !== "function") {
            throw new Error(
                "Database store class is required."
            );
        }

        return new StoreClass(this.#connection);

    }

    getStatus() {

        const baseStatus = super.getStatus();
        const migrationCount =
            this.#migrationManager &&
            this.#databaseConfiguration &&
            this.#databaseConfiguration.autoMigrate
                ? this.#migrationManager
                    .listApplied()
                    .length
                : null;

        return Object.freeze({
            ...baseStatus,
            provider: this.#databaseConfiguration
                ? this.#databaseConfiguration.provider
                : null,
            healthy: this.checkHealth(),
            migrationCount
        });

    }

}

module.exports = DatabaseService;
