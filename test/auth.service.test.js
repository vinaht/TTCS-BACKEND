const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const { AuthService } = require("../src/services/auth.service");

const createUser = async () => ({
    id: 12,
    username: "tester",
    email: "tester@example.com",
    role: "user",
    passwordHash: await bcrypt.hash("oldpass123", 4)
});

test("AuthService changePassword updates the password when current password is valid", async () => {
    const user = await createUser();
    const calls = [];
    const service = new AuthService({
        repository: {
            findUserById: async () => user,
            updatePasswordHash: async (userId, passwordHash) => {
                calls.push({ userId, passwordHash });
                return {
                    ...user,
                    passwordHash
                };
            }
        }
    });

    const result = await service.changePassword(12, {
        currentPassword: "oldpass123",
        newPassword: "newpass123",
        confirmPassword: "newpass123"
    });

    assert.deepEqual(result, { changed: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].userId, 12);
    assert.equal(await bcrypt.compare("newpass123", calls[0].passwordHash), true);
});

test("AuthService changePassword rejects an incorrect current password", async () => {
    const user = await createUser();
    const service = new AuthService({
        repository: {
            findUserById: async () => user,
            updatePasswordHash: async () => {
                throw new Error("updatePasswordHash should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.changePassword(12, {
                currentPassword: "wrongpass123",
                newPassword: "newpass123",
                confirmPassword: "newpass123"
        }),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /current password is incorrect/i);
            return true;
        }
    );
});

test("AuthService changePassword rejects a short new password", async () => {
    const service = new AuthService({
        repository: {
            findUserById: async () => {
                throw new Error("findUserById should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.changePassword(12, {
                currentPassword: "oldpass123",
                newPassword: "short",
                confirmPassword: "short"
            }),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /new password must be at least 6/i);
            return true;
        }
    );
});

test("AuthService changePassword rejects mismatched confirmation", async () => {
    const service = new AuthService({
        repository: {
            findUserById: async () => {
                throw new Error("findUserById should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.changePassword(12, {
                currentPassword: "oldpass123",
                newPassword: "newpass123",
                confirmPassword: "different123"
            }),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /confirmation does not match/i);
            return true;
        }
    );
});

test("AuthService changePassword rejects reusing the current password", async () => {
    const user = await createUser();
    const service = new AuthService({
        repository: {
            findUserById: async () => user,
            updatePasswordHash: async () => {
                throw new Error("updatePasswordHash should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.changePassword(12, {
                currentPassword: "oldpass123",
                newPassword: "oldpass123",
                confirmPassword: "oldpass123"
            }),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /different from current password/i);
            return true;
        }
    );
});
