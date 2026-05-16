const express = require("express");
const authRoutes = require("./auth.routes");
const algorithmRoutes = require("./algorithm.routes");
const solveRoutes = require("./solve.routes");
const statRoutes = require("./stat.routes");
const adminRoutes = require("./admin.routes");
const userFormulaRoutes = require("./userFormula.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/algorithms", algorithmRoutes);
router.use("/solves", solveRoutes);
router.use("/stats", statRoutes);
router.use("/admin", adminRoutes);
router.use("/user-formulas", userFormulaRoutes);

module.exports = router;
