const express = require("express");
const userFormulaController = require("../controllers/userFormula.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/status", authenticate, userFormulaController.status);
router.get("/", authenticate, userFormulaController.getAll);
router.post("/", authenticate, userFormulaController.create);
router.put("/:id", authenticate, userFormulaController.update);
router.delete("/:id", authenticate, userFormulaController.remove);

module.exports = router;
