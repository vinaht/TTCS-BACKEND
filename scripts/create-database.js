const mysql = require("mysql2/promise");

const { dbHost, dbPort, dbUser, dbPassword, dbName } = require("../src/config/env");

const DATABASE_NAME_PATTERN = /^[A-Za-z0-9_]+$/;

const createDatabase = async () => {
    if (!DATABASE_NAME_PATTERN.test(dbName)) {
        throw new Error("DB_NAME may only contain letters, numbers, and underscores.");
    }

    const connection = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        multipleStatements: false
    });

    try {
        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        console.log(`[CubeAL seed] database ready: ${dbName}@${dbHost}:${dbPort}`);
    } finally {
        await connection.end();
    }
};

createDatabase().catch((error) => {
    console.error(`[CubeAL seed] database create failed: ${error.message}`);
    process.exitCode = 1;
});
