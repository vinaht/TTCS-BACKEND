const mysql = require("mysql2/promise");

const {
    dbEnabled,
    dbHost,
    dbPort,
    dbUser,
    dbPassword,
    dbName,
    dbConnectionLimit
} = require("./env");

let pool;

const databaseState = {
    enabled: dbEnabled,
    connected: false,
    message: "skipped"
};

const getDatabaseState = () => ({
    ...databaseState
});

const getDatabasePool = () => pool;

const initializeDatabase = async () => {
    if (!dbEnabled) {
        databaseState.connected = false;
        databaseState.message = "skipped";

        return getDatabaseState();
    }

    if (pool) {
        return getDatabaseState();
    }

    if (dbPassword === "vietanh020505") {
        databaseState.connected = false;
        databaseState.message = "error:missing-password";

        throw new Error('Please update "DB_PASSWORD" in Backend/.env before starting the server.');
    }

    try {
        pool = mysql.createPool({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPassword,
            database: dbName,
            waitForConnections: true,
            connectionLimit: dbConnectionLimit,
            queueLimit: 0
        });

        await pool.query("SELECT 1");

        databaseState.connected = true;
        databaseState.message = `connected:${dbName}@${dbHost}:${dbPort}`;

        return getDatabaseState();
    } catch (error) {
        databaseState.connected = false;
        databaseState.message = `error:${error.code || "unknown"}`;
        pool = undefined;

        throw new Error(
            `Database connection failed for "${dbName}" at ${dbHost}:${dbPort}: ${error.message}`
        );
    }
};

module.exports = {
    getDatabasePool,
    getDatabaseState,
    initializeDatabase
};
