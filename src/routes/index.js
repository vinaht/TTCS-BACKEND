const express = require("express");

const healthController = require("../controllers/health.controller");
const authRoutes = require("./auth.routes");
const algorithmRoutes = require("./algorithm.routes");
const solveRoutes = require("./solve.routes");
const statRoutes = require("./stat.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.get("/health", healthController.getHealth);
router.use("/auth", authRoutes);
router.use("/algorithms", algorithmRoutes);
router.use("/solves", solveRoutes);
router.use("/stats", statRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
