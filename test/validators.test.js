const test = require("node:test");
const assert = require("node:assert/strict");

const {
    normalizeBoolean,
    normalizeLimit,
    normalizeOptionalText,
    requirePositiveInteger
} = require("../src/utils/validators");

test("validators normalize common request values", () => {
    assert.equal(requirePositiveInteger("7", "User id"), 7);
    assert.equal(normalizeLimit("250", { defaultValue: 50, maxValue: 100 }), 100);
    assert.equal(normalizeOptionalText("  OLL  ", "Category", 50), "OLL");
    assert.equal(normalizeOptionalText("", "Category", 50), null);
    assert.equal(normalizeBoolean("on", "active"), true);
    assert.equal(normalizeBoolean("0", "active"), false);
});

test("validators reject invalid common request values", () => {
    assert.throws(
        () => requirePositiveInteger("0", "User id"),
        /User id must be a positive integer/
    );
    assert.throws(
        () => normalizeOptionalText(123, "Category", 50),
        /Category must be a string/
    );
    assert.throws(
        () => normalizeBoolean("maybe", "active"),
        /active must be a boolean value/
    );
});
