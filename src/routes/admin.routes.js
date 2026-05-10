const express = require("express");
const adminController = require("../controllers/admin.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");
const { uploadAlgorithmImage } = require("../middlewares/upload.middleware");

const router = express.Router();

router.get("/status", authenticate, requireAdmin, adminController.status);
router.get("/", authenticate, requireAdmin, adminController.getOverview);
router.post(
    "/uploads/images",
    authenticate,
    requireAdmin,
    uploadAlgorithmImage,
    adminController.uploadImage
);
router.get("/algorithms", authenticate, requireAdmin, adminController.listAlgorithms);
router.get("/algorithms/:id", authenticate, requireAdmin, adminController.getAlgorithm);
router.post("/algorithms", authenticate, requireAdmin, adminController.createAlgorithm);
router.put("/algorithms/:id", authenticate, requireAdmin, adminController.updateAlgorithm);
router.delete("/algorithms/:id", authenticate, requireAdmin, adminController.deleteAlgorithm);
router.get("/users", authenticate, requireAdmin, adminController.listUsers);
router.get("/users/:id", authenticate, requireAdmin, adminController.getUser);
router.patch("/users/:id", authenticate, requireAdmin, adminController.updateUser);

module.exports = router;
