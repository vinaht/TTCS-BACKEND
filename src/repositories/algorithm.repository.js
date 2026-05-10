const { dbName } = require("../config/env");
const { getDatabasePool, getDatabaseState } = require("../config/database");
const { createPendingRepository } = require("./base.repository");
const authRepository = require("./auth.repository");
const ApiError = require("../utils/ApiError");
const { addAssignment } = require("../utils/sqlAssignments");
const {
    ALGORITHM_TABLE,
    ALGORITHM_SELECT_COLUMNS,
    REQUIRED_ALGORITHM_COLUMNS,
    mapAlgorithmRow
} = require("../models/algorithm.model");

const UNIQUE_INDEX_NAME = "uq_algorithms_course_stage_category_case_code";
const LEGACY_UNIQUE_INDEX_NAME = "uq_algorithms_category_case_code";
const CATEGORY_INDEX_NAME = "idx_algorithms_category_active";
const COURSE_STAGE_INDEX_NAME = "idx_algorithms_course_stage_active";

const baseRepository = createPendingRepository("algorithms");

let schemaReady = false;
let schemaPromise;

const getPool = () => {
    const pool = getDatabasePool();

    if (!pool) {
        throw new ApiError(503, "Database connection is not available for algorithms.");
    }

    return pool;
};

const createAlgorithmsTable = async () => {
    const pool = getPool();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${ALGORITHM_TABLE} (
            id INT NOT NULL AUTO_INCREMENT,
            course VARCHAR(30) NOT NULL DEFAULT 'cfop',
            stage VARCHAR(50) NOT NULL DEFAULT 'general',
            category VARCHAR(50) NOT NULL,
            case_code VARCHAR(50) NOT NULL,
            name VARCHAR(120) NOT NULL,
            formula VARCHAR(500) NOT NULL,
            description TEXT NULL,
            image_url VARCHAR(500) NULL,
            video_url VARCHAR(500) NULL,
            video_start_seconds INT NULL,
            video_end_seconds INT NULL,
            difficulty VARCHAR(30) NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_by INT NULL,
            updated_by INT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY ${UNIQUE_INDEX_NAME} (course, stage, category, case_code),
            KEY ${CATEGORY_INDEX_NAME} (category, is_active),
            KEY ${COURSE_STAGE_INDEX_NAME} (course, stage, is_active),
            CONSTRAINT fk_algorithms_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT fk_algorithms_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const syncAlgorithmsTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${ALGORITHM_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));

    if (!availableColumns.has("course")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN course VARCHAR(30) NOT NULL DEFAULT 'cfop' AFTER id`
        );
    }

    if (!availableColumns.has("stage")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN stage VARCHAR(50) NOT NULL DEFAULT 'general' AFTER course`
        );
    }

    if (!availableColumns.has("description")) {
        await pool.query(`ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN description TEXT NULL AFTER formula`);
    }

    if (!availableColumns.has("image_url")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN image_url VARCHAR(500) NULL AFTER description`
        );
    }

    if (!availableColumns.has("video_url")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN video_url VARCHAR(500) NULL AFTER image_url`
        );
    }

    if (!availableColumns.has("video_start_seconds")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN video_start_seconds INT NULL AFTER video_url`
        );
    }

    if (!availableColumns.has("video_end_seconds")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN video_end_seconds INT NULL AFTER video_start_seconds`
        );
    }

    if (!availableColumns.has("difficulty")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN difficulty VARCHAR(30) NULL AFTER video_end_seconds`
        );
    }

    if (!availableColumns.has("sort_order")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER difficulty`
        );
    }

    if (!availableColumns.has("is_active")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order`
        );
    }

    if (!availableColumns.has("created_by")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN created_by INT NULL AFTER is_active`
        );
    }

    if (!availableColumns.has("updated_by")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN updated_by INT NULL AFTER created_by`
        );
    }

    if (!availableColumns.has("updated_at")) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`
        );
    }

    const [indexes] = await pool.query(`SHOW INDEX FROM ${ALGORITHM_TABLE}`);
    const indexNames = new Set(indexes.map((row) => row.Key_name));

    if (indexNames.has(LEGACY_UNIQUE_INDEX_NAME)) {
        await pool.query(`ALTER TABLE ${ALGORITHM_TABLE} DROP INDEX ${LEGACY_UNIQUE_INDEX_NAME}`);
    }

    if (!indexNames.has(UNIQUE_INDEX_NAME)) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD UNIQUE KEY ${UNIQUE_INDEX_NAME} (course, stage, category, case_code)`
        );
    }

    if (!indexNames.has(CATEGORY_INDEX_NAME)) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD KEY ${CATEGORY_INDEX_NAME} (category, is_active)`
        );
    }

    if (!indexNames.has(COURSE_STAGE_INDEX_NAME)) {
        await pool.query(
            `ALTER TABLE ${ALGORITHM_TABLE} ADD KEY ${COURSE_STAGE_INDEX_NAME} (course, stage, is_active)`
        );
    }
};

const validateAlgorithmsTable = async () => {
    const pool = getPool();
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${ALGORITHM_TABLE}`);
    const availableColumns = new Set(rows.map((row) => row.Field));
    const missingColumns = REQUIRED_ALGORITHM_COLUMNS.filter((column) => !availableColumns.has(column));

    if (missingColumns.length > 0) {
        throw new ApiError(
            500,
            `Table "${ALGORITHM_TABLE}" in database "${dbName}" is missing required columns: ${missingColumns.join(", ")}.`
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
            await createAlgorithmsTable();
            await syncAlgorithmsTable();
            await validateAlgorithmsTable();
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
        table: ALGORITHM_TABLE,
        schemaReady
    };
};

const buildFilters = (filters = {}, options = {}) => {
    const whereClauses = [];
    const params = [];
    const publicOnly = options.publicOnly === true;

    if (publicOnly) {
        whereClauses.push("is_active = 1");
    } else if (typeof filters.isActive === "boolean") {
        whereClauses.push("is_active = ?");
        params.push(filters.isActive ? 1 : 0);
    }

    if (filters.course) {
        whereClauses.push("course = ?");
        params.push(filters.course);
    }

    if (filters.stage) {
        whereClauses.push("stage = ?");
        params.push(filters.stage);
    }

    if (filters.category) {
        whereClauses.push("category = ?");
        params.push(filters.category);
    }

    if (filters.search) {
        const searchValue = `%${filters.search}%`;
        whereClauses.push(
            "(name LIKE ? OR formula LIKE ? OR case_code LIKE ? OR description LIKE ? OR stage LIKE ?)"
        );
        params.push(searchValue, searchValue, searchValue, searchValue, searchValue);
    }

    return {
        whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "",
        params
    };
};

const listAlgorithms = async (filters = {}, options = {}) => {
    await ensureSchema();

    const pool = getPool();
    const page = Number(filters.page);
    const limit = Number(filters.limit);
    const offset = (page - 1) * limit;
    const { whereSql, params } = buildFilters(filters, options);
    const [rows] = await pool.query(
        `SELECT ${ALGORITHM_SELECT_COLUMNS}
         FROM ${ALGORITHM_TABLE}
         ${whereSql}
         ORDER BY course ASC, stage ASC, sort_order ASC, category ASC, case_code ASC, id ASC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM ${ALGORITHM_TABLE}
         ${whereSql}`,
        params
    );

    return {
        items: rows.map(mapAlgorithmRow),
        total: Number(countRows[0]?.total || 0)
    };
};

const findAlgorithmById = async (algorithmId, options = {}) => {
    await ensureSchema();

    const pool = getPool();
    const publicOnly = options.publicOnly === true;
    const conditions = ["id = ?"];
    const params = [algorithmId];

    if (publicOnly) {
        conditions.push("is_active = 1");
    }

    const [rows] = await pool.execute(
        `SELECT ${ALGORITHM_SELECT_COLUMNS}
         FROM ${ALGORITHM_TABLE}
         WHERE ${conditions.join(" AND ")}
         LIMIT 1`,
        params
    );

    return mapAlgorithmRow(rows[0]);
};

const createAlgorithm = async ({
    course,
    stage,
    category,
    caseCode,
    name,
    formula,
    description,
    imageUrl,
    videoUrl,
    videoStartSeconds,
    videoEndSeconds,
    difficulty,
    sortOrder,
    isActive,
    actorId
}) => {
    await ensureSchema();

    const pool = getPool();

    try {
        const [result] = await pool.execute(
            `INSERT INTO ${ALGORITHM_TABLE} (
                course,
                stage,
                category,
                case_code,
                name,
                formula,
                description,
                image_url,
                video_url,
                video_start_seconds,
                video_end_seconds,
                difficulty,
                sort_order,
                is_active,
                created_by,
                updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                course,
                stage,
                category,
                caseCode,
                name,
                formula,
                description,
                imageUrl,
                videoUrl,
                videoStartSeconds,
                videoEndSeconds,
                difficulty,
                sortOrder,
                isActive ? 1 : 0,
                actorId,
                actorId
            ]
        );

        return findAlgorithmById(result.insertId);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            throw new ApiError(409, "Algorithm case already exists for this course stage and category.");
        }

        throw error;
    }
};

const updateAlgorithm = async (algorithmId, updates = {}) => {
    await ensureSchema();

    const pool = getPool();
    const assignments = [];
    const params = [];

    addAssignment(assignments, params, "course", updates.course);
    addAssignment(assignments, params, "stage", updates.stage);
    addAssignment(assignments, params, "category", updates.category);
    addAssignment(assignments, params, "case_code", updates.caseCode);
    addAssignment(assignments, params, "name", updates.name);
    addAssignment(assignments, params, "formula", updates.formula);
    addAssignment(assignments, params, "description", updates.description);
    addAssignment(assignments, params, "image_url", updates.imageUrl);
    addAssignment(assignments, params, "video_url", updates.videoUrl);
    addAssignment(assignments, params, "video_start_seconds", updates.videoStartSeconds);
    addAssignment(assignments, params, "video_end_seconds", updates.videoEndSeconds);
    addAssignment(assignments, params, "difficulty", updates.difficulty);
    addAssignment(assignments, params, "sort_order", updates.sortOrder);
    addAssignment(
        assignments,
        params,
        "is_active",
        updates.isActive,
        (value) => (value ? 1 : 0)
    );
    addAssignment(assignments, params, "updated_by", updates.actorId);

    if (assignments.length === 0) {
        return findAlgorithmById(algorithmId);
    }

    params.push(algorithmId);

    try {
        const [result] = await pool.execute(
            `UPDATE ${ALGORITHM_TABLE}
             SET ${assignments.join(", ")}
             WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return null;
        }

        return findAlgorithmById(algorithmId);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            throw new ApiError(409, "Algorithm case already exists for this course stage and category.");
        }

        throw error;
    }
};

const deleteAlgorithm = async (algorithmId) => {
    await ensureSchema();

    const pool = getPool();
    const [result] = await pool.execute(
        `DELETE FROM ${ALGORITHM_TABLE}
         WHERE id = ?`,
        [algorithmId]
    );

    return result.affectedRows > 0;
};

const countAlgorithms = async () => {
    await ensureSchema();

    const pool = getPool();
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM ${ALGORITHM_TABLE}`);

    return Number(rows[0]?.total || 0);
};

module.exports = {
    countAlgorithms,
    createAlgorithm,
    deleteAlgorithm,
    ensureSchema,
    findAlgorithmById,
    getMeta,
    listAlgorithms,
    updateAlgorithm
};
