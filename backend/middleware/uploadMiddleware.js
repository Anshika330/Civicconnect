const multer = require("multer");

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
            error.message = "Only JPEG, PNG and WebP images are allowed";
            return callback(error);
        }

        callback(null, true);
    }
});

const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "Image size must not exceed 5 MB"
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message || "Invalid image upload"
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: "Invalid image upload"
        });
    }

    return next();
};

module.exports = { upload, handleUploadError };
