const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { jwtSecret } = require("../config/env");
const { toPublicUser } = require("../models/user.model");
const authRepository = require("../repositories/auth.repository");
const ApiError = require("../utils/ApiError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 50;

const normalizeEmail = (email) => {
    if (typeof email !== "string" || !email.trim()) {
        throw new ApiError(400, "Email is required.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw new ApiError(400, "Email format is invalid.");
    }

    return normalizedEmail;
};

const normalizeUsername = (input) => {
    if (typeof input !== "string" || !input.trim()) {
        throw new ApiError(400, "Username is required.");
    }

    const username = input.trim();

    if (username.length < MIN_USERNAME_LENGTH) {
        throw new ApiError(400, `Username must be at least ${MIN_USERNAME_LENGTH} characters long.`);
    }

    if (username.length > MAX_USERNAME_LENGTH) {
        throw new ApiError(400, `Username must not exceed ${MAX_USERNAME_LENGTH} characters.`);
    }

    return username;
};

const normalizePassword = (password) => {
    if (typeof password !== "string" || !password) {
        throw new ApiError(400, "Password is required.");
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }

    return password;
};

const normalizeRemember = (remember) => {
    return remember === true || remember === "true" || remember === "1" || remember === "on";
};

const createToken = (user, remember = false) => {
    const expiresIn = remember ? "30d" : "7d";

    return {
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
    async initialize() {
        await authRepository.ensureSchema();
    }

    async getCurrentUser(userId) {
        const user = await authRepository.findUserById(userId);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        return toPublicUser(user);
    }

    async getStatus() {
        const initialMeta = authRepository.getMeta();

        if (!initialMeta.storage || initialMeta.storage === "database-pending") {
            return {
                ...initialMeta,
                totalUsers: 0,
                plannedEndpoints: ["GET /me", "POST /register", "POST /login"]
            };
        }

        await authRepository.ensureSchema();
        const totalUsers = await authRepository.countUsers();

        return {
            ...authRepository.getMeta(),
            totalUsers,
            plannedEndpoints: ["GET /me", "POST /register", "POST /login"]
        };
    }

    async register(payload = {}) {
        const username = normalizeUsername(payload.username || payload.name);
        const email = normalizeEmail(payload.email);
        const password = normalizePassword(payload.password);

        const existingUsername = await authRepository.findUserByUsername(username);

        if (existingUsername) {
            throw new ApiError(409, "Username is already taken.");
        }

        const existingUser = await authRepository.findUserByEmail(email);

        if (existingUser) {
            throw new ApiError(409, "Email is already registered.");
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await authRepository.createUser({
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

        const user = await authRepository.findUserByEmail(email);

        if (!user) {
            throw new ApiError(401, "Email or password is incorrect.");
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            throw new ApiError(401, "Email or password is incorrect.");
        }

        const updatedUser = await authRepository.touchLastLogin(user.id);

        return buildAuthResponse(updatedUser, remember);
    }
}

module.exports = new AuthService();
