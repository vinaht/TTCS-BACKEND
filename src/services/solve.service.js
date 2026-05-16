const ApiError = require("../utils/ApiError");
const solveRepository = require("../repositories/solve.repository");
const { toPublicSolve } = require("../models/solve.model");
const {
    normalizeLimit,
    normalizeOptionalText
} = require("../utils/validators");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const toMilliseconds = (value, multiplier = 1) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    const normalizedValue = Number(value);

    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
        return Number.NaN;
    }

    return normalizedValue * multiplier;
};

const normalizeDurationMs = (payload = {}) => {
    const candidates = [
        payload.durationMs,
        payload.timeMs,
        payload.duration_ms,
        toMilliseconds(payload.timeSeconds, 1000),
        toMilliseconds(payload.durationSeconds, 1000),
        toMilliseconds(payload.time, 1000)
    ];

    const rawDurationMs = candidates.find((value) => value !== undefined && value !== null);
    const durationMs = Number(rawDurationMs);

    if (!Number.isFinite(durationMs) || durationMs <= 0) {
        throw new ApiError(400, "Solve duration is required and must be a positive number.");
    }

    return Math.round(durationMs);
};

class SolveService {
    async initialize() {
        await solveRepository.ensureSchema();
    }

    async getStatus() {
        const initialMeta = solveRepository.getMeta();

        if (!initialMeta.storage || initialMeta.storage === "database-pending") {
            return {
                ...initialMeta,
                plannedEndpoints: ["GET /", "POST /"]
            };
        }

        await solveRepository.ensureSchema();

        return {
            ...solveRepository.getMeta(),
            plannedEndpoints: ["GET /", "POST /"]
        };
    }

    async getAll(userId, query = {}) {
        const limit = normalizeLimit(query.limit, {
            defaultValue: DEFAULT_LIMIT,
            maxValue: MAX_LIMIT
        });
        const solves = await solveRepository.listSolvesByUserId(userId, limit);

        return {
            items: solves.map(toPublicSolve),
            limit,
            total: solves.length
        };
    }

    async create(userId, payload = {}) {
        const durationMs = normalizeDurationMs(payload);
        const scramble = normalizeOptionalText(payload.scramble, "Scramble", 255, {
            undefinedAs: null
        });
        const notes = normalizeOptionalText(payload.notes, "Notes", 500, {
            undefinedAs: null
        });

        const solve = await solveRepository.createSolveForUser({
            userId,
            durationMs,
            scramble,
            notes
        });

        return toPublicSolve(solve);
    }
}

module.exports = new SolveService();
