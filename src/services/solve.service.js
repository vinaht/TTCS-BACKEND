const ApiError = require("../utils/ApiError");
const solveRepository = require("../repositories/solve.repository");
const {
    SOLVE_PENALTIES,
    toPublicSolve
} = require("../models/solve.model");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const normalizeListLimit = (input) => {
    if (input === undefined) {
        return DEFAULT_LIMIT;
    }

    const limit = Number.parseInt(input, 10);

    if (!Number.isInteger(limit) || limit <= 0) {
        throw new ApiError(400, "Query parameter limit must be a positive integer.");
    }

    return Math.min(limit, MAX_LIMIT);
};

const normalizeDurationMs = (payload = {}) => {
    const candidates = [
        payload.durationMs,
        payload.timeMs,
        payload.duration_ms,
        typeof payload.timeSeconds === "number" ? payload.timeSeconds * 1000 : undefined,
        typeof payload.durationSeconds === "number" ? payload.durationSeconds * 1000 : undefined
    ];

    const rawDurationMs = candidates.find((value) => value !== undefined && value !== null);
    const durationMs = Number(rawDurationMs);

    if (!Number.isFinite(durationMs) || durationMs <= 0) {
        throw new ApiError(400, "Solve duration is required and must be a positive number.");
    }

    return Math.round(durationMs);
};

const normalizePenalty = (input) => {
    if (input === undefined || input === null || input === "") {
        return SOLVE_PENALTIES.NONE;
    }

    const penalty = String(input).trim().toLowerCase();
    const allowedPenalties = new Set(Object.values(SOLVE_PENALTIES));

    if (!allowedPenalties.has(penalty)) {
        throw new ApiError(400, "Penalty must be one of: none, plus2, dnf.");
    }

    return penalty;
};

const normalizeOptionalText = (value, fieldName, maxLength) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        throw new ApiError(400, `${fieldName} must be a string.`);
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length > maxLength) {
        throw new ApiError(400, `${fieldName} must not exceed ${maxLength} characters.`);
    }

    return normalizedValue || null;
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
        const limit = normalizeListLimit(query.limit);
        const solves = await solveRepository.listSolvesByUserId(userId, limit);

        return {
            items: solves.map(toPublicSolve),
            limit,
            total: solves.length
        };
    }

    async create(userId, payload = {}) {
        const durationMs = normalizeDurationMs(payload);
        const penalty = normalizePenalty(payload.penalty);
        const scramble = normalizeOptionalText(payload.scramble, "Scramble", 255);
        const notes = normalizeOptionalText(payload.notes, "Notes", 500);

        const solve = await solveRepository.createSolveForUser({
            userId,
            durationMs,
            penalty,
            scramble,
            notes
        });

        return toPublicSolve(solve);
    }
}

module.exports = new SolveService();
