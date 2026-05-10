const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const authRepository = require("../src/repositories/auth.repository");
const authService = require("../src/services/auth.service");
const { authenticate } = require("../src/middlewares/auth.middleware");
const { jwtSecret } = require("../src/config/env");

const originalFindUserByEmail = authRepository.findUserByEmail;
const originalFindUserById = authRepository.findUserById;
const originalTouchLastLogin = authRepository.touchLastLogin;

test.afterEach(() => {
    authRepository.findUserByEmail = originalFindUserByEmail;
    authRepository.findUserById = originalFindUserById;
    authRepository.touchLastLogin = originalTouchLastLogin;
});

test("AuthService login verifies password and returns the public user", async () => {
    const passwordHash = await bcrypt.hash("secret123", 4);
    const user = {
        id: 7,
        username: "activeuser",
        email: "active@example.com",
        passwordHash,
        role: "user"
    };

    authRepository.findUserByEmail = async () => user;
    authRepository.touchLastLogin = async () => ({
        ...user,
        lastLoginAt: new Date("2026-05-01T00:00:00.000Z")
    });

    const result = await authService.login({ email: "active@example.com", password: "secret123" });

    assert.equal(result.user.id, 7);
    assert.equal(result.user.email, "active@example.com");
});

test("authenticate attaches the current user to the request", async () => {
    authRepository.findUserById = async () => ({
        id: 7,
        username: "activeuser",
        email: "active@example.com",
        role: "user"
    });

    const token = jwt.sign(
        {
            sub: "7",
            email: "active@example.com",
            role: "user"
        },
        jwtSecret
    );
    const req = {
        headers: {
            authorization: `Bearer ${token}`
        }
    };
    let capturedError;

    await new Promise((resolve) => {
        authenticate(req, {}, (error) => {
            capturedError = error;
            resolve();
        });
    });

    assert.equal(capturedError, undefined);
    assert.equal(req.auth.userId, 7);
    assert.equal(req.user.email, "active@example.com");
});
