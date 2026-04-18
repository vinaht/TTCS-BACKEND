const SOLVE_TABLE = "solves";

const SOLVE_PENALTIES = {
    NONE: "none",
    PLUS_TWO: "plus2",
    DNF: "dnf"
};

const REQUIRED_SOLVE_COLUMNS = [
    "id",
    "user_id",
    "duration_ms",
    "penalty",
    "scramble",
    "notes",
    "created_at",
    "updated_at"
];

const SOLVE_SELECT_COLUMNS = `
    id,
    user_id,
    duration_ms,
    penalty,
    scramble,
    notes,
    created_at,
    updated_at
`;

const getFinalTimeMs = ({ durationMs, penalty }) => {
    if (penalty === SOLVE_PENALTIES.DNF) {
        return null;
    }

    if (penalty === SOLVE_PENALTIES.PLUS_TWO) {
        return durationMs + 2000;
    }

    return durationMs;
};

const mapSolveRow = (row) => {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        durationMs: row.duration_ms,
        penalty: row.penalty,
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

    const finalTimeMs = getFinalTimeMs(solve);

    return {
        id: solve.id,
        userId: solve.userId,
        durationMs: solve.durationMs,
        durationSeconds: Number((solve.durationMs / 1000).toFixed(2)),
        penalty: solve.penalty,
        finalTimeMs,
        finalTimeSeconds:
            finalTimeMs === null ? null : Number((finalTimeMs / 1000).toFixed(2)),
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
        .map((solve) => getFinalTimeMs(solve))
        .map((timeMs) => (timeMs === null ? Number.POSITIVE_INFINITY : timeMs))
        .sort((left, right) => left - right);

    const trimmedTimes = sortable.slice(1, -1);

    if (trimmedTimes.some((timeMs) => !Number.isFinite(timeMs))) {
        return null;
    }

    const average = trimmedTimes.reduce((sum, timeMs) => sum + timeMs, 0) / trimmedTimes.length;

    return Math.round(average);
};

module.exports = {
    REQUIRED_SOLVE_COLUMNS,
    SOLVE_PENALTIES,
    SOLVE_SELECT_COLUMNS,
    SOLVE_TABLE,
    calculateAverageWindow,
    getFinalTimeMs,
    mapSolveRow,
    toPublicSolve
};
