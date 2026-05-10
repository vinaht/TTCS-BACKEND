const ApiError = require("./ApiError");

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "off"]);

const requirePositiveInteger = (value, fieldName) => {
    const numberValue = Number.parseInt(value, 10);

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
        throw new ApiError(400, `${fieldName} must be a positive integer.`);
    }

    return numberValue;
};

const normalizePage = (value, { defaultValue = 1 } = {}) => {
    if (value === undefined) {
        return defaultValue;
    }

    return requirePositiveInteger(value, "Query parameter page");
};

const normalizeLimit = (value, { defaultValue, maxValue } = {}) => {
    if (value === undefined) {
        return defaultValue;
    }

    const limit = requirePositiveInteger(value, "Query parameter limit");
    return maxValue ? Math.min(limit, maxValue) : limit;
};

const normalizeOptionalText = (
    value,
    fieldName,
    maxLength,
    { undefinedAs = undefined, emptyAs = null } = {}
) => {
    if (value === undefined) {
        return undefinedAs;
    }

    if (value === null || value === "") {
        return emptyAs;
    }

    if (typeof value !== "string") {
        throw new ApiError(400, `${fieldName} must be a string.`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
        throw new ApiError(400, `${fieldName} must not exceed ${maxLength} characters.`);
    }

    return text || emptyAs;
};

const normalizeRequiredText = (value, fieldName, maxLength) => {
    if (value === undefined || value === null || value === "") {
        throw new ApiError(400, `${fieldName} is required.`);
    }

    if (typeof value !== "string") {
        throw new ApiError(400, `${fieldName} must be a string.`);
    }

    const text = value.trim();

    if (!text) {
        throw new ApiError(400, `${fieldName} is required.`);
    }

    if (text.length > maxLength) {
        throw new ApiError(400, `${fieldName} must not exceed ${maxLength} characters.`);
    }

    return text;
};

const normalizeBoolean = (
    value,
    fieldName,
    { undefinedAs = undefined, allowNumbers = true } = {}
) => {
    if (value === undefined) {
        return undefinedAs;
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (allowNumbers && typeof value === "number") {
        if (value === 1) {
            return true;
        }

        if (value === 0) {
            return false;
        }
    }

    if (typeof value === "string") {
        const text = value.trim().toLowerCase();

        if (TRUE_VALUES.has(text)) {
            return true;
        }

        if (FALSE_VALUES.has(text)) {
            return false;
        }
    }

    throw new ApiError(400, `${fieldName} must be a boolean value.`);
};

module.exports = {
    normalizeBoolean,
    normalizeLimit,
    normalizeOptionalText,
    normalizePage,
    normalizeRequiredText,
    requirePositiveInteger
};
