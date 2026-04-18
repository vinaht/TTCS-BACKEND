const express = require("express");
const solveController = require("../controllers/solve.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/status", solveController.status);
router.get("/", authenticate, solveController.getAll);
router.post("/", authenticate, solveController.create);

module.exports = router;
