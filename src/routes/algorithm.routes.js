const express = require("express");
const algorithmController = require("../controllers/algorithm.controller");

const router = express.Router();

router.get("/status", algorithmController.status);
router.get("/", algorithmController.getAll);
router.get("/:id", algorithmController.getById);

module.exports = router;
