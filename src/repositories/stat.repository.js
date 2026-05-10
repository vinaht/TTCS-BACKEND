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
            COUNT(*) AS completed_solves,
            MIN(duration_ms) AS best_time_ms,
            AVG(duration_ms) AS average_time_ms
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
