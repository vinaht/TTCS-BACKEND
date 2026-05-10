const { dbName } = require("../config/env");
const { getDatabasePool, getDatabaseState } = require("../config/database");
const { createPendingRepository } = require("./base.repository");
const ApiError = require("../utils/ApiError");
const {
    USER_TABLE,
    USER_SELECT_COLUMNS,
    REQUIRED_USER_COLUMNS,
    mapUserRow
} = require("../models/user.model");

const baseRepository = createPendingRepository("auth");

let schemaReady = false;
let schemaPromise;

const getPool = () => {
    const pool = getDatabasePool();

    if (!pool) {
        throw new ApiError(503, "Database connection is not available for auth.");
    }

    return pool;
};

const createUsersTable = async () => {
    const pool = getPool();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${USER_TABLE} (
            id INT NOT NULL AUTO_INCREMENT,
            username VARCHAR(50) NOT NULL,
            email VARCHAR(191) NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            last_login_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_users_username (username),
            UNIQUE KEY uq_users_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const syncUsersTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${USER_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));
    const alterStatements = [];

    if (!availableColumns.has("last_login_at")) {
        alterStatements.push(
            `ALTER TABLE ${USER_TABLE} ADD COLUMN last_login_at DATETIME NULL AFTER role`
        );
    }

    if (!availableColumns.has("updated_at")) {
        alterStatements.push(
            `ALTER TABLE ${USER_TABLE} ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`
        );
    }

    for (const statement of alterStatements) {
        await pool.query(statement);
    }
};

const validateUsersTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${USER_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));
    const missingColumns = REQUIRED_USER_COLUMNS.filter((column) => !availableColumns.has(column));

    if (missingColumns.length > 0) {
        throw new ApiError(
            500,
            `Table "${USER_TABLE}" in database "${dbName}" is missing required columns: ${missingColumns.join(", ")}.`
        );
    }
};

const ensureSchema = async () => {
    const databaseState = getDatabaseState();

    if (!databaseState.connected) {
        return false;
    }

    if (schemaReady) {
        return true;
    }

    if (!schemaPromise) {
        schemaPromise = (async () => {
            await createUsersTable();
            await syncUsersTable();
            await validateUsersTable();
            schemaReady = true;
            return true;
        })().catch((error) => {
            schemaPromise = undefined;
            throw error;
        });
    }

    return schemaPromise;
};

const getMeta = () => {
    const baseMeta = baseRepository.getMeta();

    return {
        ...baseMeta,
        ready: baseMeta.ready && schemaReady,
        table: USER_TABLE,
        schemaReady
    };
};

const findUserById = async (userId) => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.execute(
        `SELECT ${USER_SELECT_COLUMNS}
         FROM ${USER_TABLE}
         WHERE id = ?
         LIMIT 1`,
        [userId]
    );

    return mapUserRow(rows[0]);
};

const findUserByUsername = async (username) => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.execute(
        `SELECT ${USER_SELECT_COLUMNS}
         FROM ${USER_TABLE}
         WHERE username = ?
         LIMIT 1`,
        [username]
    );

    return mapUserRow(rows[0]);
};

const findUserByEmail = async (email) => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.execute(
        `SELECT ${USER_SELECT_COLUMNS}
         FROM ${USER_TABLE}
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return mapUserRow(rows[0]);
};

const createUser = async ({ username, email, passwordHash, role = "user" }) => {
    await ensureSchema();

    const pool = getPool();

    try {
        const [result] = await pool.execute(
            `INSERT INTO ${USER_TABLE} (username, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [username, email, passwordHash, role]
        );

        return findUserById(result.insertId);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            if (error.message.includes("uq_users_username") || error.message.includes("username")) {
                throw new ApiError(409, "Username is already taken.");
            }

            if (error.message.includes("uq_users_email") || error.message.includes("email")) {
                throw new ApiError(409, "Email is already registered.");
            }

            throw new ApiError(409, "User already exists.");
        }

        throw error;
    }
};

const touchLastLogin = async (userId) => {
    await ensureSchema();

    const pool = getPool();
    await pool.execute(
        `UPDATE ${USER_TABLE}
         SET last_login_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [userId]
    );

    return findUserById(userId);
};

const updatePasswordHash = async (userId, passwordHash) => {
    await ensureSchema();

    const pool = getPool();
    const [result] = await pool.execute(
        `UPDATE ${USER_TABLE}
         SET password = ?
         WHERE id = ?`,
        [passwordHash, userId]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return findUserById(userId);
};

const countUsers = async () => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM ${USER_TABLE}`);

    return rows[0]?.total || 0;
};

module.exports = {
    countUsers,
    createUser,
    ensureSchema,
    findUserByEmail,
    findUserById,
    findUserByUsername,
    getMeta,
    touchLastLogin,
    updatePasswordHash
};
