const test = require("node:test");
const assert = require("node:assert/strict");

const { AlgorithmService } = require("../src/services/algorithm.service");

test("AlgorithmService validates required fields before create", async () => {
    const service = new AlgorithmService({
        repository: {
            createAlgorithm: async () => {
                throw new Error("createAlgorithm should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.create(
                {
                    category: "OLL",
                    caseCode: "27",
                    name: "Sune"
                },
                1
            ),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /Algorithm is required/);
            return true;
        }
    );
});

test("AlgorithmService returns paginated public list", async () => {
    const calls = [];
    const service = new AlgorithmService({
        repository: {
            listAlgorithms: async (filters, options) => {
                calls.push({ filters, options });
                return {
                    items: [
                        {
                            id: 1,
                            course: "cfop",
                            stage: "oll",
                            category: "OLL",
                            caseCode: "27",
                            name: "Sune",
                            formula: "R U R' U R U2 R'",
                            description: null,
                            imageUrl: "/uploads/algorithms/images/oll-27.webp",
                            videoUrl: "https://www.youtube.com/watch?v=abc123",
                            videoStartSeconds: 83,
                            videoEndSeconds: 117,
                            difficulty: "medium",
                            sortOrder: 27,
                            isActive: true,
                            createdBy: 1,
                            updatedBy: 1,
                            createdAt: "2026-04-24T00:00:00.000Z",
                            updatedAt: "2026-04-24T00:00:00.000Z"
                        }
                    ],
                    total: 1
                };
            }
        }
    });

    const result = await service.getAll({
        page: "2",
        limit: "5",
        search: "Sune",
        course: "cfop",
        stage: "oll",
        category: "OLL"
    });

    assert.equal(calls[0].options.publicOnly, true);
    assert.equal(calls[0].filters.page, 2);
    assert.equal(calls[0].filters.limit, 5);
    assert.equal(calls[0].filters.course, "cfop");
    assert.equal(calls[0].filters.stage, "oll");
    assert.equal(result.pagination.page, 2);
    assert.equal(result.pagination.totalItems, 1);
    assert.equal(result.items[0].caseCode, "27");
    assert.equal(result.items[0].imageUrl, "/uploads/algorithms/images/oll-27.webp");
    assert.equal(result.items[0].videoUrl, "https://www.youtube.com/watch?v=abc123");
    assert.equal(result.items[0].videoStartSeconds, 83);
    assert.equal(result.items[0].videoEndSeconds, 117);
    assert.equal(result.items[0].sortOrder, 27);
});

test("AlgorithmService normalizes media and placement fields before create", async () => {
    const calls = [];
    const service = new AlgorithmService({
        repository: {
            createAlgorithm: async (payload) => {
                calls.push(payload);
                return {
                    id: 2,
                    ...payload,
                    createdBy: payload.actorId,
                    updatedBy: payload.actorId,
                    createdAt: "2026-04-24T00:00:00.000Z",
                    updatedAt: "2026-04-24T00:00:00.000Z"
                };
            }
        }
    });

    const result = await service.create(
        {
            course: "CFOP",
            stage: "OLL",
            category: "OLL",
            caseCode: "27",
            name: "Sune",
            formula: "R U R' U R U2 R'",
            imageUrl: "/uploads/algorithms/images/oll-27.webp",
            videoUrl: "https://www.youtube.com/watch?v=abc123",
            videoStartSeconds: "1:23",
            videoEndSeconds: "1:57",
            sortOrder: "27",
            isActive: true
        },
        1
    );

    assert.equal(calls[0].course, "cfop");
    assert.equal(calls[0].stage, "oll");
    assert.equal(calls[0].imageUrl, "/uploads/algorithms/images/oll-27.webp");
    assert.equal(calls[0].videoUrl, "https://www.youtube.com/watch?v=abc123");
    assert.equal(calls[0].videoStartSeconds, 83);
    assert.equal(calls[0].videoEndSeconds, 117);
    assert.equal(calls[0].sortOrder, 27);
    assert.equal(result.course, "cfop");
    assert.equal(result.stage, "oll");
});

test("AlgorithmService rejects external image URLs", async () => {
    const service = new AlgorithmService({
        repository: {
            createAlgorithm: async () => {
                throw new Error("createAlgorithm should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.create(
                {
                    course: "cfop",
                    stage: "oll",
                    category: "OLL",
                    caseCode: "27",
                    name: "Sune",
                    formula: "R U R' U R U2 R'",
                    imageUrl: "https://example.com/oll-27.webp"
                },
                1
            ),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /uploaded image path/i);
            return true;
        }
    );
});

test("AlgorithmService rejects invalid video URLs", async () => {
    const service = new AlgorithmService({
        repository: {
            createAlgorithm: async () => {
                throw new Error("createAlgorithm should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.create(
                {
                    course: "cfop",
                    stage: "oll",
                    category: "OLL",
                    caseCode: "27",
                    name: "Sune",
                    formula: "R U R' U R U2 R'",
                    videoUrl: "not-a-url"
                },
                1
            ),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /valid URL/i);
            return true;
        }
    );
});

test("AlgorithmService rejects invalid video time ranges", async () => {
    const service = new AlgorithmService({
        repository: {
            createAlgorithm: async () => {
                throw new Error("createAlgorithm should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.create(
                {
                    course: "cfop",
                    stage: "oll",
                    category: "OLL",
                    caseCode: "27",
                    name: "Sune",
                    formula: "R U R' U R U2 R'",
                    videoUrl: "https://www.youtube.com/watch?v=abc123",
                    videoStartSeconds: "1:57",
                    videoEndSeconds: "1:23"
                },
                1
            ),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /end time must be greater/i);
            return true;
        }
    );
});

test("AlgorithmService rejects malformed video timestamps", async () => {
    const service = new AlgorithmService({
        repository: {
            createAlgorithm: async () => {
                throw new Error("createAlgorithm should not be called");
            }
        }
    });

    await assert.rejects(
        () =>
            service.create(
                {
                    course: "cfop",
                    stage: "oll",
                    category: "OLL",
                    caseCode: "27",
                    name: "Sune",
                    formula: "R U R' U R U2 R'",
                    videoUrl: "https://www.youtube.com/watch?v=abc123",
                    videoStartSeconds: "1:75"
                },
                1
            ),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /below 60/i);
            return true;
        }
    );
});

test("AlgorithmService remove fails when algorithm does not exist", async () => {
    const service = new AlgorithmService({
        repository: {
            deleteAlgorithm: async () => false
        }
    });

    await assert.rejects(
        () => service.remove("99"),
        (error) => {
            assert.equal(error.statusCode, 404);
            assert.match(error.message, /Algorithm not found/);
            return true;
        }
    );
});
