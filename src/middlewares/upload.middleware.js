const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const multer = require("multer");

const { algorithmImageDir, algorithmImagePublicPath } = require("../config/uploads");
const ApiError = require("../utils/ApiError");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

fs.mkdirSync(algorithmImageDir, { recursive: true });

const getSafeExtension = (file) => {
    const originalExtension = path.extname(file.originalname || "").toLowerCase();

    if (ALLOWED_IMAGE_EXTENSIONS.has(originalExtension)) {
        return originalExtension === ".jpeg" ? ".jpg" : originalExtension;
    }

    if (file.mimetype === "image/jpeg") {
        return ".jpg";
    }

    if (file.mimetype === "image/png") {
        return ".png";
    }

    if (file.mimetype === "image/webp") {
        return ".webp";
    }

    return "";
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, algorithmImageDir);
    },
    filename: (req, file, callback) => {
        const extension = getSafeExtension(file);
        const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;

        callback(null, filename);
    }
});

const fileFilter = (req, file, callback) => {
    const extension = getSafeExtension(file);

    if (!extension || !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        callback(new ApiError(400, "Only JPG, PNG, and WEBP images are allowed."));
        return;
    }

    callback(null, true);
};

const algorithmImageUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 1
    }
}).single("image");

const uploadAlgorithmImage = (req, res, next) => {
    algorithmImageUpload(req, res, (error) => {
        if (error) {
            if (error instanceof multer.MulterError) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    return next(new ApiError(400, "Image must not exceed 5MB."));
                }

                return next(new ApiError(400, "Invalid image upload."));
            }

            return next(error);
        }

        if (!req.file) {
            return next(new ApiError(400, "Image file is required."));
        }

        req.uploadedImageUrl = `${algorithmImagePublicPath}/${req.file.filename}`;
        return next();
    });
};

module.exports = {
    uploadAlgorithmImage
};
