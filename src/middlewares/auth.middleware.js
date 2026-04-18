const jwt = require("jsonwebtoken");

const { jwtSecret } = require("../config/env");
const { toPublicUser } = require("../models/user.model");
const authRepository = require("../repositories/auth.repository");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("./asyncHandler");

const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader) {
        throw new ApiError(401, "Authentication token is required.");
    }

    if (typeof authorizationHeader !== "string") {
        throw new ApiError(401, "Authorization header is invalid.");
    }

    const parts = authorizationHeader.trim().split(/\s+/);

    if (parts.length !== 2) {
        throw new ApiError(401, "Authorization header must use Bearer token.");
    }

    const [scheme, token] = parts;

    if (scheme.toLowerCase() !== "bearer" || !token) {
        throw new ApiError(401, "Authorization header must use Bearer token.");
    }

    return token;
};

const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, jwtSecret);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Authentication token has expired.");
        }

        if (error.name === "JsonWebTokenError") {
            throw new ApiError(401, "Authentication token is invalid.");
        }

        throw error;
    }
};

const resolveAuthenticatedUser = async (payload) => {
    const userId = Number(payload?.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
        throw new ApiError(401, "Authentication token payload is invalid.");
    }

    const user = await authRepository.findUserById(userId);

    if (!user) {
        throw new ApiError(401, "Authenticated user no longer exists.");
    }

    return user;
};

const authenticate = asyncHandler(async (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    const payload = verifyAccessToken(token);
    const user = await resolveAuthenticatedUser(payload);

    req.auth = {
        token,
        payload,
        userId: user.id
    };
    req.user = toPublicUser(user);

    next();
});

const requireRole = (...allowedRoles) => {
    const normalizedRoles = allowedRoles.flat().filter(Boolean);

    if (normalizedRoles.length === 0) {
        throw new Error("requireRole needs at least one role.");
    }

    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, "Authentication is required before checking role."));
        }

        if (!normalizedRoles.includes(req.user.role)) {
            return next(new ApiError(403, "You do not have permission to access this resource."));
        }

        return next();
    };
};

const requireAdmin = requireRole("admin");

module.exports = {
    authenticate,
    extractBearerToken,
    requireAdmin,
    requireRole,
    verifyAccessToken
};
