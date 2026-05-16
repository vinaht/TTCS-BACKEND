const { dbName } = require("../config/env");
const { getDatabasePool, getDatabaseState } = require("../config/database");
const { createPendingRepository } = require("./base.repository");
const authRepository = require("./auth.repository");
const ApiError = require("../utils/ApiError");
const {
    REQUIRED_SOLVE_COLUMNS,
    SOLVE_SELECT_COLUMNS,
    SOLVE_TABLE,
    mapSolveRow
} = require("../models/solve.model");

const baseRepository = createPendingRepository("solves");

let schemaReady = false;
let schemaPromise;
let hasTimeColumn = false;

const getPool = () => {
    const pool = getDatabasePool();

    if (!pool) {
        throw new ApiError(503, "Database connection is not available for solves.");
    }

    return pool;
};

const createSolvesTable = async () => {
    const pool = getPool();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${SOLVE_TABLE} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            duration_ms INT UNSIGNED NOT NULL,
            time DECIMAL(10,3) NOT NULL,
            scramble VARCHAR(255) NULL,
            notes VARCHAR(500) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_solves_user_created_at (user_id, created_at),
            CONSTRAINT fk_solves_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const syncSolvesTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${SOLVE_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));
    hasTimeColumn = availableColumns.has("time");

    if (!availableColumns.has("duration_ms")) {
        if (!availableColumns.has("time")) {
            throw new ApiError(
                500,
                `Table "${SOLVE_TABLE}" is missing "duration_ms" and there is no legacy "time" column to migrate from.`
            );
        }

        await pool.query(
            `ALTER TABLE ${SOLVE_TABLE} ADD COLUMN duration_ms INT UNSIGNED NULL AFTER user_id`
        );
        await pool.query(
            `UPDATE ${SOLVE_TABLE} SET duration_ms = ROUND(time * 1000) WHERE duration_ms IS NULL`
        );
        await pool.query(
            `ALTER TABLE ${SOLVE_TABLE} MODIFY COLUMN duration_ms INT UNSIGNED NOT NULL`
        );
    }

    if (!availableColumns.has("time")) {
        await pool.query(
            `ALTER TABLE ${SOLVE_TABLE} ADD COLUMN time DECIMAL(10,3) NULL AFTER duration_ms`
        );
        await pool.query(
            `UPDATE ${SOLVE_TABLE}
             SET time = ROUND(duration_ms / 1000, 3)
             WHERE time IS NULL`
        );
        await pool.query(
            `ALTER TABLE ${SOLVE_TABLE} MODIFY COLUMN time DECIMAL(10,3) NOT NULL`
        );
        hasTimeColumn = true;
    } else {
        await pool.query(
            `UPDATE ${SOLVE_TABLE}
             SET time = ROUND(duration_ms / 1000, 3)
             WHERE time IS NULL`
        );
    }

    if (!availableColumns.has("notes")) {
        await pool.query(
            `ALTER TABLE ${SOLVE_TABLE} ADD COLUMN notes VARCHAR(500) NULL AFTER scramble`
        );
    }

    if (!availableColumns.has("updated_at")) {
        await pool.query(
            `ALTER TABLE ${SOLVE_TABLE} ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`
        );
    }
};

const validateSolvesTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${SOLVE_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));
    hasTimeColumn = availableColumns.has("time");
    const missingColumns = REQUIRED_SOLVE_COLUMNS.filter((column) => !availableColumns.has(column));

    if (missingColumns.length > 0) {
        throw new ApiError(
            500,
            `Table "${SOLVE_TABLE}" in database "${dbName}" is missing required columns: ${missingColumns.join(", ")}.`
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
            await createSolvesTable();
            await syncSolvesTable();
            await validateSolvesTable();
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
        table: SOLVE_TABLE,
        schemaReady
    };
};

const listSolvesByUserId = async (userId, limit = 50) => {
    await ensureSchema();

    const pool = getPool();
    const safeLimit = Number(limit);
    const [rows] = await pool.query(
        `SELECT ${SOLVE_SELECT_COLUMNS}
         FROM ${SOLVE_TABLE}
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ${safeLimit}`,
        [userId]
    );

    return rows.map(mapSolveRow);
};

const createSolveForUser = async ({ userId, durationMs, scramble, notes }) => {
    await ensureSchema();

    const pool = getPool();
    const scrambleValue = scramble || "";
    const timeSeconds = Number((durationMs / 1000).toFixed(3));
    const [result] = await pool.execute(
        hasTimeColumn
            ? `INSERT INTO ${SOLVE_TABLE} (user_id, duration_ms, time, scramble, notes)
               VALUES (?, ?, ?, ?, ?)`
            : `INSERT INTO ${SOLVE_TABLE} (user_id, duration_ms, scramble, notes)
               VALUES (?, ?, ?, ?)`,
        hasTimeColumn
            ? [userId, durationMs, timeSeconds, scrambleValue, notes]
            : [userId, durationMs, scrambleValue, notes]
    );

    const [rows] = await pool.execute(
        `SELECT ${SOLVE_SELECT_COLUMNS}
         FROM ${SOLVE_TABLE}
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapSolveRow(rows[0]);
};

const listRecentSolvesByUserId = async (userId, limit = 12) => {
    return listSolvesByUserId(userId, limit);
};

module.exports = {
    createSolveForUser,
    ensureSchema,
    getMeta,
    listRecentSolvesByUserId,
    listSolvesByUserId
};
