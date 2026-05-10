const { dbName } = require("../config/env");
const { getDatabasePool, getDatabaseState } = require("../config/database");
const { createPendingRepository } = require("./base.repository");
const authRepository = require("./auth.repository");
const ApiError = require("../utils/ApiError");
const { addAssignment } = require("../utils/sqlAssignments");
const {
    REQUIRED_USER_FORMULA_COLUMNS,
    USER_FORMULA_SELECT_COLUMNS,
    USER_FORMULA_TABLE,
    mapUserFormulaRow
} = require("../models/userFormula.model");

const USER_UPDATED_INDEX_NAME = "idx_user_formulas_user_updated_at";
const USER_CATEGORY_INDEX_NAME = "idx_user_formulas_user_category";

const baseRepository = createPendingRepository("user-formulas");

let schemaReady = false;
let schemaPromise;

const getPool = () => {
    const pool = getDatabasePool();

    if (!pool) {
        throw new ApiError(503, "Database connection is not available for user algorithms.");
    }

    return pool;
};

const createUserFormulasTable = async () => {
    const pool = getPool();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${USER_FORMULA_TABLE} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            name VARCHAR(120) NOT NULL,
            category VARCHAR(50) NULL,
            case_code VARCHAR(50) NULL,
            formula VARCHAR(500) NOT NULL,
            notes VARCHAR(500) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY ${USER_UPDATED_INDEX_NAME} (user_id, updated_at),
            KEY ${USER_CATEGORY_INDEX_NAME} (user_id, category),
            CONSTRAINT fk_user_formulas_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const syncUserFormulasTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${USER_FORMULA_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));

    if (!availableColumns.has("category")) {
        await pool.query(
            `ALTER TABLE ${USER_FORMULA_TABLE} ADD COLUMN category VARCHAR(50) NULL AFTER name`
        );
    }

    if (!availableColumns.has("case_code")) {
        await pool.query(
            `ALTER TABLE ${USER_FORMULA_TABLE} ADD COLUMN case_code VARCHAR(50) NULL AFTER category`
        );
    }

    if (!availableColumns.has("notes")) {
        await pool.query(
            `ALTER TABLE ${USER_FORMULA_TABLE} ADD COLUMN notes VARCHAR(500) NULL AFTER formula`
        );
    }

    if (!availableColumns.has("updated_at")) {
        await pool.query(
            `ALTER TABLE ${USER_FORMULA_TABLE} ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`
        );
    }

    const [indexes] = await pool.query(`SHOW INDEX FROM ${USER_FORMULA_TABLE}`);
    const indexNames = new Set(indexes.map((row) => row.Key_name));

    if (!indexNames.has(USER_UPDATED_INDEX_NAME)) {
        await pool.query(
            `ALTER TABLE ${USER_FORMULA_TABLE} ADD KEY ${USER_UPDATED_INDEX_NAME} (user_id, updated_at)`
        );
    }

    if (!indexNames.has(USER_CATEGORY_INDEX_NAME)) {
        await pool.query(
            `ALTER TABLE ${USER_FORMULA_TABLE} ADD KEY ${USER_CATEGORY_INDEX_NAME} (user_id, category)`
        );
    }
};

const validateUserFormulasTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${USER_FORMULA_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));
    const missingColumns = REQUIRED_USER_FORMULA_COLUMNS.filter(
        (column) => !availableColumns.has(column)
    );

    if (missingColumns.length > 0) {
        throw new ApiError(
            500,
            `Table "${USER_FORMULA_TABLE}" in database "${dbName}" is missing required columns: ${missingColumns.join(", ")}.`
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
            await createUserFormulasTable();
            await syncUserFormulasTable();
            await validateUserFormulasTable();
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
        table: USER_FORMULA_TABLE,
        schemaReady
    };
};

const buildListFilters = ({ userId, search, category } = {}) => {
    const whereClauses = ["user_id = ?"];
    const params = [userId];

    if (category) {
        whereClauses.push("category = ?");
        params.push(category);
    }

    if (search) {
        const searchValue = `%${search}%`;
        whereClauses.push("(name LIKE ? OR category LIKE ? OR case_code LIKE ? OR formula LIKE ?)");
        params.push(searchValue, searchValue, searchValue, searchValue);
    }

    return {
        whereSql: `WHERE ${whereClauses.join(" AND ")}`,
        params
    };
};

const listUserFormulas = async (filters = {}) => {
    await ensureSchema();

    const pool = getPool();
    const safeLimit = Number(filters.limit);
    const { whereSql, params } = buildListFilters(filters);
    const [rows] = await pool.query(
        `SELECT ${USER_FORMULA_SELECT_COLUMNS}
         FROM ${USER_FORMULA_TABLE}
         ${whereSql}
         ORDER BY updated_at DESC, id DESC
         LIMIT ${safeLimit}`,
        params
    );
    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM ${USER_FORMULA_TABLE}
         ${whereSql}`,
        params
    );

    return {
        items: rows.map(mapUserFormulaRow),
        total: Number(countRows[0]?.total || 0)
    };
};

const findUserFormulaByIdForUser = async (formulaId, userId) => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.execute(
        `SELECT ${USER_FORMULA_SELECT_COLUMNS}
         FROM ${USER_FORMULA_TABLE}
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        [formulaId, userId]
    );

    return mapUserFormulaRow(rows[0]);
};

const createUserFormula = async ({ userId, name, category, caseCode, formula, notes }) => {
    await ensureSchema();

    const pool = getPool();
    const [result] = await pool.execute(
        `INSERT INTO ${USER_FORMULA_TABLE} (
            user_id,
            name,
            category,
            case_code,
            formula,
            notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, name, category, caseCode, formula, notes]
    );

    return findUserFormulaByIdForUser(result.insertId, userId);
};

const updateUserFormula = async (formulaId, userId, updates = {}) => {
    await ensureSchema();

    const pool = getPool();
    const assignments = [];
    const params = [];

    addAssignment(assignments, params, "name", updates.name);
    addAssignment(assignments, params, "category", updates.category);
    addAssignment(assignments, params, "case_code", updates.caseCode);
    addAssignment(assignments, params, "formula", updates.formula);
    addAssignment(assignments, params, "notes", updates.notes);

    if (assignments.length === 0) {
        return findUserFormulaByIdForUser(formulaId, userId);
    }

    params.push(formulaId, userId);

    const [result] = await pool.execute(
        `UPDATE ${USER_FORMULA_TABLE}
         SET ${assignments.join(", ")}
         WHERE id = ? AND user_id = ?`,
        params
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return findUserFormulaByIdForUser(formulaId, userId);
};

const deleteUserFormula = async (formulaId, userId) => {
    await ensureSchema();

    const pool = getPool();
    const [result] = await pool.execute(
        `DELETE FROM ${USER_FORMULA_TABLE}
         WHERE id = ? AND user_id = ?`,
        [formulaId, userId]
    );

    return result.affectedRows > 0;
};

module.exports = {
    createUserFormula,
    deleteUserFormula,
    ensureSchema,
    findUserFormulaByIdForUser,
    getMeta,
    listUserFormulas,
    updateUserFormula
};
