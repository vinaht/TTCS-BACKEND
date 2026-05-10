const test = require("node:test");
const assert = require("node:assert/strict");

const { UserFormulaService } = require("../src/services/userFormula.service");

test("UserFormulaService validates required fields before create", async () => {
    const service = new UserFormulaService({
        repository: {
            createUserFormula: async () => {
                throw new Error("createUserFormula should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.create(1, {
                name: "Sune",
                category: "OLL"
            }),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /Algorithm is required/);
            return true;
        }
    );
});

test("UserFormulaService lists formulas for the current user and caps limit", async () => {
    const calls = [];
    const service = new UserFormulaService({
        repository: {
            listUserFormulas: async (filters) => {
                calls.push(filters);
                return {
                    items: [
                        {
                            id: 3,
                            userId: 7,
                            name: "Sune",
                            category: "OLL",
                            caseCode: "27",
                            formula: "R U R' U R U2 R'",
                            notes: null,
                            createdAt: "2026-04-24T00:00:00.000Z",
                            updatedAt: "2026-04-24T00:00:00.000Z"
                        }
                    ],
                    total: 1
                };
            }
        }
    });

    const result = await service.getAll(7, {
        limit: "500",
        search: " Sune ",
        category: " OLL "
    });

    assert.equal(calls[0].userId, 7);
    assert.equal(calls[0].limit, 100);
    assert.equal(calls[0].search, "Sune");
    assert.equal(calls[0].category, "OLL");
    assert.equal(result.total, 1);
    assert.equal(result.items[0].userId, 7);
});

test("UserFormulaService refuses to update formulas outside the current user", async () => {
    const calls = [];
    const service = new UserFormulaService({
        repository: {
            updateUserFormula: async (formulaId, userId, updates) => {
                calls.push({ formulaId, userId, updates });
                return null;
            }
        }
    });

    await assert.rejects(
        () => service.update(7, 12, { notes: "practice again" }),
        (error) => {
            assert.equal(error.statusCode, 404);
            assert.match(error.message, /Algorithm not found/);
            return true;
        }
    );

    assert.deepEqual(calls[0], {
        formulaId: 12,
        userId: 7,
        updates: {
            notes: "practice again"
        }
    });
});

test("UserFormulaService refuses to delete formulas outside the current user", async () => {
    const calls = [];
    const service = new UserFormulaService({
        repository: {
            deleteUserFormula: async (formulaId, userId) => {
                calls.push({ formulaId, userId });
                return false;
            }
        }
    });

    await assert.rejects(
        () => service.remove(7, 12),
        (error) => {
            assert.equal(error.statusCode, 404);
            assert.match(error.message, /Algorithm not found/);
            return true;
        }
    );

    assert.deepEqual(calls[0], {
        formulaId: 12,
        userId: 7
    });
});
