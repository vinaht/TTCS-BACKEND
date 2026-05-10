const ApiError = require("../utils/ApiError");
const userFormulaRepository = require("../repositories/userFormula.repository");
const { toPublicUserFormula } = require("../models/userFormula.model");
const {
    normalizeLimit,
    normalizeOptionalText,
    normalizeRequiredText,
    requirePositiveInteger
} = require("../utils/validators");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const normalizeId = (value, fieldName = "Algorithm id") =>
    requirePositiveInteger(value, fieldName);

const normalizeFormulaPayload = (payload = {}, { partial = false } = {}) => {
    const normalizedPayload = {};

    if (!partial || payload.name !== undefined) {
        normalizedPayload.name = normalizeRequiredText(payload.name, "Name", 120);
    }

    if (!partial || payload.category !== undefined) {
        normalizedPayload.category = normalizeOptionalText(payload.category, "Category", 50);
    }

    if (!partial || payload.caseCode !== undefined || payload.case_code !== undefined) {
        normalizedPayload.caseCode = normalizeOptionalText(
            payload.caseCode ?? payload.case_code,
            "Case code",
            50
        );
    }

    if (!partial || payload.formula !== undefined) {
        normalizedPayload.formula = normalizeRequiredText(payload.formula, "Algorithm", 500);
    }

    if (!partial || payload.notes !== undefined) {
        normalizedPayload.notes = normalizeOptionalText(payload.notes, "Notes", 500);
    }

    return Object.fromEntries(
        Object.entries(normalizedPayload).filter(([, value]) => value !== undefined)
    );
};

class UserFormulaService {
    constructor({ repository = userFormulaRepository } = {}) {
        this.repository = repository;
    }

    async initialize() {
        await this.repository.ensureSchema();
    }

    async getStatus() {
        const initialMeta = this.repository.getMeta();
        const plannedEndpoints = ["GET /", "POST /", "PUT /:id", "DELETE /:id"];

        if (!initialMeta.storage || initialMeta.storage === "database-pending") {
            return {
                ...initialMeta,
                plannedEndpoints
            };
        }

        await this.repository.ensureSchema();

        return {
            ...this.repository.getMeta(),
            plannedEndpoints
        };
    }

    async getAll(userId, query = {}) {
        const normalizedUserId = normalizeId(userId, "User id");
        const limit = normalizeLimit(query.limit, {
            defaultValue: DEFAULT_LIMIT,
            maxValue: MAX_LIMIT
        });
        const result = await this.repository.listUserFormulas({
            userId: normalizedUserId,
            limit,
            search: normalizeOptionalText(query.search, "Search", 100),
            category: normalizeOptionalText(query.category, "Category", 50)
        });

        return {
            items: result.items.map(toPublicUserFormula),
            limit,
            total: result.total
        };
    }

    async create(userId, payload = {}) {
        const formula = await this.repository.createUserFormula({
            userId: normalizeId(userId, "User id"),
            ...normalizeFormulaPayload(payload)
        });

        return toPublicUserFormula(formula);
    }

    async update(userId, formulaId, payload = {}) {
        const updates = normalizeFormulaPayload(payload, { partial: true });

        if (Object.keys(updates).length === 0) {
            throw new ApiError(400, "At least one algorithm field must be provided.");
        }

        const formula = await this.repository.updateUserFormula(
            normalizeId(formulaId),
            normalizeId(userId, "User id"),
            updates
        );

        if (!formula) {
            throw new ApiError(404, "Algorithm not found.");
        }

        return toPublicUserFormula(formula);
    }

    async remove(userId, formulaId) {
        const deleted = await this.repository.deleteUserFormula(
            normalizeId(formulaId),
            normalizeId(userId, "User id")
        );

        if (!deleted) {
            throw new ApiError(404, "Algorithm not found.");
        }

        return {
            id: normalizeId(formulaId),
            deleted: true
        };
    }
}

const userFormulaService = new UserFormulaService();

module.exports = userFormulaService;
module.exports.UserFormulaService = UserFormulaService;
