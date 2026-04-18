const express = require("express");
const adminController = require("../controllers/admin.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/status", authenticate, requireAdmin, adminController.status);
router.get("/", authenticate, requireAdmin, adminController.getOverview);

module.exports = router;
