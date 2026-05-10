const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/status", authController.status);
router.get("/me", authenticate, authController.me);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.patch("/password", authenticate, authController.changePassword);

module.exports = router;
