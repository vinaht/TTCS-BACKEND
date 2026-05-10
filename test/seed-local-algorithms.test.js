const test = require("node:test");
const assert = require("node:assert/strict");

const {
    buildCfopCatalog,
    normalizeFormula
} = require("../scripts/seed-local-algorithms");

test("CFOP catalog seed builds all F2L OLL and PLL assets", () => {
    const catalog = buildCfopCatalog();
    const counts = catalog.reduce(
        (totals, seed) => {
            totals[seed.stage] = (totals[seed.stage] || 0) + 1;
            return totals;
        },
        {}
    );
    const caseCodes = new Set(catalog.map((seed) => seed.caseCode));

    assert.equal(catalog.length, 119);
    assert.deepEqual(counts, {
        f2l: 41,
        oll: 57,
        pll: 21
    });
    assert.equal(caseCodes.size, catalog.length);
    assert.ok(catalog.every((seed) => seed.course === "cfop"));
    assert.ok(catalog.every((seed) => seed.isActive === true));

    const firstF2l = catalog.find((seed) => seed.stage === "f2l" && seed.sortOrder === 1);

    assert.equal(firstF2l.caseCode, "F2L-01");
    assert.equal(firstF2l.name, "F2L 01");
    assert.equal(firstF2l.imageFileName, "cfop-f2l-01.png");
});

test("CFOP catalog seed normalizes formulas from file names", () => {
    const catalog = buildCfopCatalog();

    assert.equal(normalizeFormula("\u200By l\u2019 U\u2019 l"), "y l' U' l");
    assert.equal(catalog.some((seed) => /[\u200B\u200C\u200D\uFEFF]/.test(seed.formula)), false);
    assert.equal(catalog.some((seed) => /[\u2018\u2019]/.test(seed.formula)), false);
    assert.ok(
        catalog.some(
            (seed) =>
                seed.stage === "oll" &&
                seed.formula === "y l' U' l (U2 L' U2 L U2) R' F R"
        )
    );
});
