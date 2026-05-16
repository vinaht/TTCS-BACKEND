const SOLVE_TABLE = "solves";

const REQUIRED_SOLVE_COLUMNS = [
    "id",
    "user_id",
    "duration_ms",
    "time",
    "scramble",
    "notes",
    "created_at",
    "updated_at"
];

const SOLVE_SELECT_COLUMNS = `
    id,
    user_id,
    duration_ms,
    time,
    scramble,
    notes,
    created_at,
    updated_at
`;

const mapSolveRow = (row) => {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        durationMs: row.duration_ms,
        time:
            row.time === undefined || row.time === null
                ? Number((row.duration_ms / 1000).toFixed(3))
                : Number(row.time),
        scramble: row.scramble,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const toPublicSolve = (solve) => {
    if (!solve) {
        return null;
    }

    return {
        id: solve.id,
        userId: solve.userId,
        durationMs: solve.durationMs,
        durationSeconds: Number((solve.durationMs / 1000).toFixed(2)),
        time:
            solve.time === undefined || solve.time === null
                ? Number((solve.durationMs / 1000).toFixed(3))
                : Number(solve.time),
        scramble: solve.scramble,
        notes: solve.notes,
        createdAt: solve.createdAt,
        updatedAt: solve.updatedAt
    };
};

const calculateAverageWindow = (solves) => {
    if (!Array.isArray(solves) || solves.length < 3) {
        return null;
    }

    const sortable = solves
        .map((solve) => solve.durationMs)
        .sort((left, right) => left - right);

    const trimmedTimes = sortable.slice(1, -1);

    const average = trimmedTimes.reduce((sum, timeMs) => sum + timeMs, 0) / trimmedTimes.length;

    return Math.round(average);
};

module.exports = {
    REQUIRED_SOLVE_COLUMNS,
    SOLVE_SELECT_COLUMNS,
    SOLVE_TABLE,
    calculateAverageWindow,
    mapSolveRow,
    toPublicSolve
};
