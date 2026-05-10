const algorithmRepository = require("../repositories/algorithm.repository");
const { toPublicAlgorithm } = require("../models/algorithm.model");
const ApiError = require("../utils/ApiError");
const { createListResponse } = require("../utils/listResponse");
const {
    normalizeBoolean,
    normalizeLimit,
    normalizeOptionalText,
    normalizePage,
    normalizeRequiredText,
    requirePositiveInteger
} = require("../utils/validators");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_VIDEO_TIME_SECONDS = 2147483647;
const ALLOWED_COURSES = new Set(["beginner", "cfop"]);

const normalizeId = (value, fieldName = "Algorithm id") =>
    requirePositiveInteger(value, fieldName);

const normalizeCourse = (value, { required = false } = {}) => {
    if (value === undefined) {
        if (required) {
            throw new ApiError(400, "Course is required.");
        }

        return undefined;
    }

    if (typeof value !== "string" || !value.trim()) {
        throw new ApiError(400, "Course is required.");
    }

    const normalizedValue = value.trim().toLowerCase();

    if (!ALLOWED_COURSES.has(normalizedValue)) {
        throw new ApiError(400, "Course must be either beginner or cfop.");
    }

    return normalizedValue;
};

const normalizeStage = (value, { required = false } = {}) => {
    if (value === undefined) {
        if (required) {
            throw new ApiError(400, "Stage is required.");
        }

        return undefined;
    }

    if (typeof value !== "string" || !value.trim()) {
        throw new ApiError(400, "Stage is required.");
    }

    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue.length > 50) {
        throw new ApiError(400, "Stage must not exceed 50 characters.");
    }

    return normalizedValue;
};

const normalizeInteger = (value, fieldName, { defaultValue, required = false } = {}) => {
    if (value === undefined || value === null || value === "") {
        if (required) {
            throw new ApiError(400, `${fieldName} is required.`);
        }

        return defaultValue;
    }

    const normalizedValue = Number.parseInt(value, 10);

    if (!Number.isInteger(normalizedValue)) {
        throw new ApiError(400, `${fieldName} must be an integer.`);
    }

    return normalizedValue;
};

const normalizeImageUrl = (value) => {
    const normalizedValue = normalizeOptionalText(value, "Image URL", 500);

    if (!normalizedValue) {
        return normalizedValue;
    }

    if (!normalizedValue.startsWith("/uploads/")) {
        throw new ApiError(400, "Image URL must be an uploaded image path.");
    }

    if (normalizedValue.includes("\\") || normalizedValue.includes("..")) {
        throw new ApiError(400, "Image URL is invalid.");
    }

    return normalizedValue;
};

const normalizeVideoUrl = (value) => {
    const normalizedValue = normalizeOptionalText(value, "Video URL", 500);

    if (!normalizedValue) {
        return normalizedValue;
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(normalizedValue);
    } catch (error) {
        throw new ApiError(400, "Video URL must be a valid URL.");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new ApiError(400, "Video URL must use http or https.");
    }

    return normalizedValue;
};

const normalizeVideoTime = (value, fieldName) => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === "") {
        return null;
    }

    if (typeof value === "number") {
        if (!Number.isInteger(value) || value < 0 || value > MAX_VIDEO_TIME_SECONDS) {
            throw new ApiError(400, `${fieldName} must be a non-negative number of seconds.`);
        }

        return value;
    }

    if (typeof value !== "string") {
        throw new ApiError(400, `${fieldName} must be a time value.`);
    }

    const text = value.trim();

    if (!text) {
        return null;
    }

    if (/^\d+$/.test(text)) {
        const seconds = Number.parseInt(text, 10);

        if (seconds > MAX_VIDEO_TIME_SECONDS) {
            throw new ApiError(400, `${fieldName} is too large.`);
        }

        return seconds;
    }

    const parts = text.split(":");

    if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
        throw new ApiError(400, `${fieldName} must use seconds, mm:ss, or hh:mm:ss.`);
    }

    const values = parts.map((part) => Number.parseInt(part, 10));
    const secondsPart = values[values.length - 1];
    const minutesPart = values[values.length - 2];

    if (secondsPart > 59 || minutesPart > 59) {
        throw new ApiError(400, `${fieldName} minutes and seconds must be below 60.`);
    }

    const seconds = parts.length === 2
        ? (values[0] * 60) + values[1]
        : (values[0] * 3600) + (values[1] * 60) + values[2];

    if (seconds > MAX_VIDEO_TIME_SECONDS) {
        throw new ApiError(400, `${fieldName} is too large.`);
    }

    return seconds;
};

const validateVideoTimeRange = ({ videoStartSeconds, videoEndSeconds }) => {
    if (
        videoStartSeconds !== undefined &&
        videoEndSeconds !== undefined &&
        videoStartSeconds !== null &&
        videoEndSeconds !== null &&
        videoEndSeconds <= videoStartSeconds
    ) {
        throw new ApiError(400, "Video end time must be greater than video start time.");
    }
};

const normalizeAlgorithmPayload = (payload = {}, { partial = false } = {}) => {
    const normalizedPayload = {};

    if (!partial || payload.category !== undefined) {
        normalizedPayload.category = partial
            ? normalizeOptionalText(payload.category, "Category", 50)
            : normalizeRequiredText(payload.category, "Category", 50);
    }

    if (!partial || payload.caseCode !== undefined || payload.case_code !== undefined) {
        const caseCode = payload.caseCode ?? payload.case_code;
        normalizedPayload.caseCode = partial
            ? normalizeOptionalText(caseCode, "Case code", 50)
            : normalizeRequiredText(caseCode, "Case code", 50);
    }

    if (!partial || payload.name !== undefined) {
        normalizedPayload.name = partial
            ? normalizeOptionalText(payload.name, "Name", 120)
            : normalizeRequiredText(payload.name, "Name", 120);
    }

    if (!partial || payload.formula !== undefined) {
        normalizedPayload.formula = partial
            ? normalizeOptionalText(payload.formula, "Algorithm", 500)
            : normalizeRequiredText(payload.formula, "Algorithm", 500);
    }

    if (!partial || payload.course !== undefined) {
        normalizedPayload.course = normalizeCourse(payload.course, { required: !partial });
    }

    if (!partial || payload.stage !== undefined) {
        normalizedPayload.stage = normalizeStage(payload.stage, { required: !partial });
    }

    if (payload.description !== undefined) {
        normalizedPayload.description = normalizeOptionalText(payload.description, "Description", 2000);
    } else if (!partial) {
        normalizedPayload.description = null;
    }

    if (payload.imageUrl !== undefined || payload.image_url !== undefined) {
        normalizedPayload.imageUrl = normalizeImageUrl(payload.imageUrl ?? payload.image_url);
    } else if (!partial) {
        normalizedPayload.imageUrl = null;
    }

    if (payload.videoUrl !== undefined || payload.video_url !== undefined) {
        normalizedPayload.videoUrl = normalizeVideoUrl(payload.videoUrl ?? payload.video_url);
    } else if (!partial) {
        normalizedPayload.videoUrl = null;
    }

    if (payload.videoStartSeconds !== undefined || payload.video_start_seconds !== undefined) {
        normalizedPayload.videoStartSeconds = normalizeVideoTime(
            payload.videoStartSeconds ?? payload.video_start_seconds,
            "Video start time"
        );
    } else if (!partial) {
        normalizedPayload.videoStartSeconds = null;
    }

    if (payload.videoEndSeconds !== undefined || payload.video_end_seconds !== undefined) {
        normalizedPayload.videoEndSeconds = normalizeVideoTime(
            payload.videoEndSeconds ?? payload.video_end_seconds,
            "Video end time"
        );
    } else if (!partial) {
        normalizedPayload.videoEndSeconds = null;
    }

    validateVideoTimeRange(normalizedPayload);

    if (payload.difficulty !== undefined) {
        normalizedPayload.difficulty = normalizeOptionalText(payload.difficulty, "Difficulty", 30);
    } else if (!partial) {
        normalizedPayload.difficulty = null;
    }

    if (payload.sortOrder !== undefined || payload.sort_order !== undefined) {
        normalizedPayload.sortOrder = normalizeInteger(
            payload.sortOrder ?? payload.sort_order,
            "Sort order",
            { defaultValue: 0 }
        );
    } else if (!partial) {
        normalizedPayload.sortOrder = 0;
    }

    if (payload.isActive !== undefined || payload.is_active !== undefined) {
        normalizedPayload.isActive = normalizeBoolean(
            payload.isActive ?? payload.is_active,
            "isActive"
        );
    } else if (!partial) {
        normalizedPayload.isActive = true;
    }

    return Object.fromEntries(
        Object.entries(normalizedPayload).filter(([, value]) => value !== undefined)
    );
};

class AlgorithmService {
    constructor({ repository = algorithmRepository } = {}) {
        this.repository = repository;
    }

    async initialize() {
        await this.repository.ensureSchema();
    }

    async getStatus() {
        const initialMeta = this.repository.getMeta();

        if (!initialMeta.storage || initialMeta.storage === "database-pending") {
            return {
                ...initialMeta,
                plannedEndpoints: ["GET /", "GET /:id"]
            };
        }

        await this.repository.ensureSchema();

        return {
            ...this.repository.getMeta(),
            plannedEndpoints: ["GET /", "GET /:id"]
        };
    }

    async getAll(query = {}, options = {}) {
        const page = normalizePage(query.page);
        const limit = normalizeLimit(query.limit, {
            defaultValue: DEFAULT_LIMIT,
            maxValue: MAX_LIMIT
        });
        const search = normalizeOptionalText(query.search, "Search", 100);
        const course = normalizeCourse(query.course);
        const stage = normalizeStage(query.stage);
        const category = normalizeOptionalText(query.category, "Category", 50);
        const isAdmin = options.isAdmin === true;
        const isActive = isAdmin ? normalizeBoolean(query.isActive, "isActive") : undefined;
        const filters = {
            page,
            limit,
            search,
            course,
            stage,
            category,
            isActive
        };
        const result = await this.repository.listAlgorithms(filters, {
            publicOnly: !isAdmin
        });

        return createListResponse({
            items: result.items.map(toPublicAlgorithm),
            page,
            limit,
            total: result.total
        });
    }

    async getById(id, options = {}) {
        const algorithmId = normalizeId(id);
        const algorithm = await this.repository.findAlgorithmById(algorithmId, {
            publicOnly: options.isAdmin !== true
        });

        if (!algorithm) {
            throw new ApiError(404, "Algorithm not found.");
        }

        return toPublicAlgorithm(algorithm);
    }

    async create(payload = {}, actorId) {
        const algorithm = await this.repository.createAlgorithm({
            ...normalizeAlgorithmPayload(payload),
            actorId: normalizeId(actorId, "Admin user id")
        });

        return toPublicAlgorithm(algorithm);
    }

    async update(id, payload = {}, actorId) {
        const algorithmId = normalizeId(id);
        const updates = normalizeAlgorithmPayload(payload, { partial: true });

        if (Object.keys(updates).length === 0) {
            throw new ApiError(400, "At least one algorithm field must be provided.");
        }

        const algorithm = await this.repository.updateAlgorithm(algorithmId, {
            ...updates,
            actorId: normalizeId(actorId, "Admin user id")
        });

        if (!algorithm) {
            throw new ApiError(404, "Algorithm not found.");
        }

        return toPublicAlgorithm(algorithm);
    }

    async remove(id) {
        const algorithmId = normalizeId(id);
        const deleted = await this.repository.deleteAlgorithm(algorithmId);

        if (!deleted) {
            throw new ApiError(404, "Algorithm not found.");
        }

        return {
            id: algorithmId,
            deleted: true
        };
    }
}

const algorithmService = new AlgorithmService();

module.exports = algorithmService;
module.exports.AlgorithmService = AlgorithmService;
