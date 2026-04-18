const express = require("express");
const statController = require("../controllers/stat.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/status", statController.status);
router.get("/", authenticate, statController.getOverview);

module.exports = router;
