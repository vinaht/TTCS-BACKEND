const { dbName } = require("../config/env");
const { getDatabasePool, getDatabaseState } = require("../config/database");
const { createPendingRepository } = require("./base.repository");
const authRepository = require("./auth.repository");
const ApiError = require("../utils/ApiError");
const { addAssignment } = require("../utils/sqlAssignments");
const { USER_TABLE, buildUserSelectColumns, mapUserRow } = require("../models/user.model");

const REMINDER_LOG_TABLE = "reminder_logs";
const REQUIRED_REMINDER_LOG_COLUMNS = [
    "id",
    "user_id",
    "trigger_type",
    "sent_by",
    "inactive_days",
    "status",
    "error_message",
    "sent_at"
];

const baseRepository = createPendingRepository("admin");

let schemaReady = false;
let schemaPromise;

const getPool = () => {
    const pool = getDatabasePool();

    if (!pool) {
        throw new ApiError(503, "Database connection is not available for admin.");
    }

    return pool;
};

const inactivityExpression = "TIMESTAMPDIFF(DAY, COALESCE(u.last_login_at, u.created_at), CURRENT_TIMESTAMP)";
const lastReminderJoin = `
    LEFT JOIN (
        SELECT user_id, MAX(sent_at) AS last_reminder_at
        FROM ${REMINDER_LOG_TABLE}
        WHERE status = 'sent'
        GROUP BY user_id
    ) rl ON rl.user_id = u.id
`;

const userAdminSelectColumns = `
    ${buildUserSelectColumns("u")},
    COALESCE(u.last_login_at, u.created_at) AS last_activity_at,
    ${inactivityExpression} AS inactive_days,
    rl.last_reminder_at
`;

const createReminderLogTable = async () => {
    const pool = getPool();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${REMINDER_LOG_TABLE} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id INT NULL,
            trigger_type VARCHAR(20) NOT NULL,
            sent_by INT NULL,
            inactive_days INT UNSIGNED NULL,
            status VARCHAR(20) NOT NULL,
            error_message VARCHAR(500) NULL,
            sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_reminder_logs_user_sent_at (user_id, sent_at),
            KEY idx_reminder_logs_trigger_sent_at (trigger_type, sent_at),
            CONSTRAINT fk_reminder_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT fk_reminder_logs_sender FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const syncReminderLogTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${REMINDER_LOG_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));

    if (!availableColumns.has("sent_by")) {
        await pool.query(
            `ALTER TABLE ${REMINDER_LOG_TABLE} ADD COLUMN sent_by INT NULL AFTER trigger_type`
        );
    }

    if (!availableColumns.has("inactive_days")) {
        await pool.query(
            `ALTER TABLE ${REMINDER_LOG_TABLE} ADD COLUMN inactive_days INT UNSIGNED NULL AFTER sent_by`
        );
    }

    if (!availableColumns.has("status")) {
        await pool.query(
            `ALTER TABLE ${REMINDER_LOG_TABLE} ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'sent' AFTER inactive_days`
        );
    }

    if (!availableColumns.has("error_message")) {
        await pool.query(
            `ALTER TABLE ${REMINDER_LOG_TABLE} ADD COLUMN error_message VARCHAR(500) NULL AFTER status`
        );
    }
};

const validateReminderLogTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${REMINDER_LOG_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));
    const missingColumns = REQUIRED_REMINDER_LOG_COLUMNS.filter(
        (column) => !availableColumns.has(column)
    );

    if (missingColumns.length > 0) {
        throw new ApiError(
            500,
            `Table "${REMINDER_LOG_TABLE}" in database "${dbName}" is missing required columns: ${missingColumns.join(", ")}.`
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
            await authRepository.ensureSchema();
            await createReminderLogTable();
            await syncReminderLogTable();
            await validateReminderLogTable();
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
        table: REMINDER_LOG_TABLE,
        schemaReady
    };
};

const buildUserFilters = (filters = {}) => {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        const searchValue = `%${filters.search}%`;
        whereClauses.push("(u.username LIKE ? OR u.email LIKE ?)");
        params.push(searchValue, searchValue);
    }

    if (filters.role) {
        whereClauses.push("u.role = ?");
        params.push(filters.role);
    }

    if (typeof filters.inactive === "boolean") {
        whereClauses.push(
            filters.inactive
                ? `${inactivityExpression} >= ?`
                : `${inactivityExpression} < ?`
        );
        params.push(filters.inactiveThresholdDays);
    }

    return {
        whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "",
        params
    };
};

const listUsers = async (filters = {}) => {
    await ensureSchema();

    const pool = getPool();
    const limit = Number(filters.limit);
    const page = Number(filters.page);
    const offset = (page - 1) * limit;
    const { whereSql, params } = buildUserFilters(filters);
    const [rows] = await pool.query(
        `SELECT ${userAdminSelectColumns}
         FROM ${USER_TABLE} u
         ${lastReminderJoin}
         ${whereSql}
         ORDER BY u.created_at DESC, u.id DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM ${USER_TABLE} u
         ${whereSql}`,
        params
    );

    return {
        items: rows.map(mapUserRow),
        total: Number(countRows[0]?.total || 0)
    };
};

const findUserById = async (userId) => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.execute(
        `SELECT ${userAdminSelectColumns}
         FROM ${USER_TABLE} u
         ${lastReminderJoin}
         WHERE u.id = ?
         LIMIT 1`,
        [userId]
    );

    return mapUserRow(rows[0]);
};

const updateUser = async (userId, updates = {}) => {
    await ensureSchema();

    const pool = getPool();
    const assignments = [];
    const params = [];

    addAssignment(assignments, params, "username", updates.username);
    addAssignment(assignments, params, "email", updates.email);
    addAssignment(assignments, params, "role", updates.role);

    if (assignments.length === 0) {
        return findUserById(userId);
    }

    params.push(userId);

    try {
        const [result] = await pool.execute(
            `UPDATE ${USER_TABLE}
             SET ${assignments.join(", ")}
             WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return null;
        }

        return findUserById(userId);
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

const getUserOverviewCounts = async (inactiveThresholdDays) => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.execute(
        `SELECT
            COUNT(*) AS total_users,
            SUM(
                CASE
                    WHEN TIMESTAMPDIFF(DAY, COALESCE(last_login_at, created_at), CURRENT_TIMESTAMP) < ?
                    THEN 1
                    ELSE 0
                END
            ) AS active_users,
            SUM(
                CASE
                    WHEN TIMESTAMPDIFF(DAY, COALESCE(last_login_at, created_at), CURRENT_TIMESTAMP) >= ?
                    THEN 1
                    ELSE 0
                END
            ) AS inactive_users
         FROM ${USER_TABLE}`,
        [inactiveThresholdDays, inactiveThresholdDays]
    );

    return rows[0] || {};
};

const listEligibleAutoReminderTargets = async ({ thresholdDays, cooldownDays }) => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.query(
        `SELECT
            ${buildUserSelectColumns("u")},
            COALESCE(u.last_login_at, u.created_at) AS last_activity_at,
            ${inactivityExpression} AS inactive_days,
            rl.last_reminder_at,
            1 AS can_receive_reminder
         FROM ${USER_TABLE} u
         ${lastReminderJoin}
         WHERE ${inactivityExpression} >= ?
           AND (rl.last_reminder_at IS NULL OR rl.last_reminder_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY))
         ORDER BY inactive_days DESC, u.id DESC`,
        [thresholdDays, cooldownDays]
    );

    return rows.map(mapUserRow);
};

const createReminderLog = async ({
    userId = null,
    triggerType,
    sentBy = null,
    inactiveDays = null,
    status,
    errorMessage = null
}) => {
    await ensureSchema();

    const pool = getPool();
    await pool.execute(
        `INSERT INTO ${REMINDER_LOG_TABLE} (
            user_id,
            trigger_type,
            sent_by,
            inactive_days,
            status,
            error_message
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, triggerType, sentBy, inactiveDays, status, errorMessage]
    );
};

const getLastAutoReminderRun = async () => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.query(
        `SELECT MAX(sent_at) AS last_run
         FROM ${REMINDER_LOG_TABLE}
         WHERE trigger_type = 'auto'`
    );

    return rows[0]?.last_run || null;
};

module.exports = {
    createReminderLog,
    ensureSchema,
    findUserById,
    getLastAutoReminderRun,
    getMeta,
    getUserOverviewCounts,
    listEligibleAutoReminderTargets,
    listUsers,
    updateUser
};
