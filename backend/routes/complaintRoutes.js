const express = require("express");
const { createComplaint } = require("../controllers/complaintController");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const { upload, handleUploadError } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
    "/",
    authenticate,
    authorizeRoles("citizen"),
    upload.single("image"),
    handleUploadError,
    createComplaint
);

module.exports = router;
