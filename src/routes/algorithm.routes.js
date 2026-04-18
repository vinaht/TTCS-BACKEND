const express = require("express");
const algorithmController = require("../controllers/algorithm.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/status", algorithmController.status);
router.get("/", algorithmController.getAll);
router.get("/:id", algorithmController.getById);
router.post("/", authenticate, requireAdmin, algorithmController.create);
router.put("/:id", authenticate, requireAdmin, algorithmController.update);
router.delete("/:id", authenticate, requireAdmin, algorithmController.remove);

module.exports = router;
