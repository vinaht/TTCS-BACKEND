const { getDatabasePool } = require("../config/database");
const { SOLVE_TABLE, SOLVE_SELECT_COLUMNS, mapSolveRow } = require("../models/solve.model");
const solveRepository = require("./solve.repository");

const getMeta = () => {
    const solveMeta = solveRepository.getMeta();

    return {
        module: "stats",
        storage: solveMeta.storage,
        ready: solveMeta.ready,
        database: solveMeta.database,
        sourceTable: solveMeta.table,
        schemaReady: solveMeta.schemaReady
    };
};

const ensureSchema = async () => solveRepository.ensureSchema();

const listRecentSolvesByUserId = async (userId, limit = 12) => {
    await ensureSchema();

    const pool = getDatabasePool();
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

const getSolveSummaryByUserId = async (userId) => {
    await ensureSchema();

    const pool = getDatabasePool();
    const [rows] = await pool.execute(
        `SELECT
            COUNT(*) AS total_solves,
            SUM(CASE WHEN penalty = 'dnf' THEN 0 ELSE 1 END) AS completed_solves,
            SUM(CASE WHEN penalty = 'dnf' THEN 1 ELSE 0 END) AS dnf_solves,
            MIN(
                CASE
                    WHEN penalty = 'dnf' THEN NULL
                    WHEN penalty = 'plus2' THEN duration_ms + 2000
                    ELSE duration_ms
                END
            ) AS best_time_ms,
            AVG(
                CASE
                    WHEN penalty = 'dnf' THEN NULL
                    WHEN penalty = 'plus2' THEN duration_ms + 2000
                    ELSE duration_ms
                END
            ) AS average_time_ms
         FROM ${SOLVE_TABLE}
         WHERE user_id = ?`,
        [userId]
    );

    return rows[0];
};

module.exports = {
    ensureSchema,
    getMeta,
    getSolveSummaryByUserId,
    listRecentSolvesByUserId
};
