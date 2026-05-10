const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { jwtSecret } = require("../config/env");
const { toPublicUser } = require("../models/user.model");
const authRepository = require("../repositories/auth.repository");
const ApiError = require("../utils/ApiError");
const {
    normalizeBoolean,
    normalizeRequiredText,
    requirePositiveInteger
} = require("../utils/validators");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 50;

const normalizeEmail = (email) => {
    const normalizedEmail = normalizeRequiredText(email, "Email", 191).toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw new ApiError(400, "Email format is invalid.");
    }

    return normalizedEmail;
};

const normalizeUsername = (input) => {
    const username = normalizeRequiredText(input, "Username", MAX_USERNAME_LENGTH);

    if (username.length < MIN_USERNAME_LENGTH) {
        throw new ApiError(400, `Username must be at least ${MIN_USERNAME_LENGTH} characters long.`);
    }

    if (username.length > MAX_USERNAME_LENGTH) {
        throw new ApiError(400, `Username must not exceed ${MAX_USERNAME_LENGTH} characters.`);
    }

    return username;
};

const normalizePassword = (password, fieldName = "Password") => {
    if (typeof password !== "string" || !password) {
        throw new ApiError(400, `${fieldName} is required.`);
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new ApiError(400, `${fieldName} must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }

    return password;
};

const normalizeConfirmPassword = (password) => {
    if (typeof password !== "string" || !password) {
        throw new ApiError(400, "Password confirmation is required.");
    }

    return password;
};

const normalizeRemember = (remember) => {
    if (remember === undefined || remember === null || remember === "") {
        return false;
    }

    return normalizeBoolean(remember, "remember", {
        undefinedAs: false
    });
};

const createToken = (user, remember = false) => {
    const expiresIn = remember ? "30d" : "7d";

    return {
        // JWT keeps the login state on the client; protected routes verify it on each request.
        token: jwt.sign(
            {
                sub: String(user.id),
                email: user.email,
                role: user.role
            },
            jwtSecret,
            { expiresIn }
        ),
        expiresIn
    };
};

const buildAuthResponse = (user, remember = false) => {
    const { token, expiresIn } = createToken(user, remember);

    return {
        token,
        tokenType: "Bearer",
        expiresIn,
        user: toPublicUser(user)
    };
};

class AuthService {
    constructor({ repository = authRepository } = {}) {
        this.repository = repository;
    }

    async initialize() {
        await this.repository.ensureSchema();
    }

    async getCurrentUser(userId) {
        const user = await this.repository.findUserById(userId);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        return toPublicUser(user);
    }

    async getStatus() {
        const initialMeta = this.repository.getMeta();

        if (!initialMeta.storage || initialMeta.storage === "database-pending") {
            return {
                ...initialMeta,
                totalUsers: 0,
                plannedEndpoints: ["GET /me", "POST /register", "POST /login", "PATCH /password"]
            };
        }

        await this.repository.ensureSchema();
        const totalUsers = await this.repository.countUsers();

        return {
            ...this.repository.getMeta(),
            totalUsers,
            plannedEndpoints: ["GET /me", "POST /register", "POST /login", "PATCH /password"]
        };
    }

    async register(payload = {}) {
        const username = normalizeUsername(payload.username || payload.name);
        const email = normalizeEmail(payload.email);
        const password = normalizePassword(payload.password);

        const existingUsername = await this.repository.findUserByUsername(username);

        if (existingUsername) {
            throw new ApiError(409, "Username is already taken.");
        }

        const existingUser = await this.repository.findUserByEmail(email);

        if (existingUser) {
            throw new ApiError(409, "Email is already registered.");
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await this.repository.createUser({
            username,
            email,
            passwordHash
        });

        return buildAuthResponse(user);
    }

    async login(payload = {}) {
        const email = normalizeEmail(payload.email);
        const password = normalizePassword(payload.password);
        const remember = normalizeRemember(payload.remember);

        const user = await this.repository.findUserByEmail(email);

        if (!user) {
            throw new ApiError(401, "Email or password is incorrect.");
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            throw new ApiError(401, "Email or password is incorrect.");
        }

        const updatedUser = await this.repository.touchLastLogin(user.id);

        return buildAuthResponse(updatedUser, remember);
    }

    async changePassword(userId, payload = {}) {
        const normalizedUserId = requirePositiveInteger(userId, "User id");
        const currentPassword = normalizePassword(payload.currentPassword, "Current password");
        const newPassword = normalizePassword(payload.newPassword, "New password");
        const confirmPassword = normalizeConfirmPassword(payload.confirmPassword);

        if (newPassword !== confirmPassword) {
            throw new ApiError(400, "Password confirmation does not match.");
        }

        const user = await this.repository.findUserById(normalizedUserId);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isCurrentPasswordValid) {
            throw new ApiError(400, "Current password is incorrect.");
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);

        if (isSamePassword) {
            throw new ApiError(400, "New password must be different from current password.");
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.repository.updatePasswordHash(normalizedUserId, passwordHash);

        return {
            changed: true
        };
    }
}

const authService = new AuthService();

module.exports = authService;
module.exports.AuthService = AuthService;
