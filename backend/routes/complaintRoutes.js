const express = require("express");
const {
    createComplaint,
    getMyComplaints,
    getAllComplaints,
    getComplaintStats,
    getComplaintById,
    updateComplaintStatus,
    updateComplaintPriority,
    assignComplaint,
    classifyComplaintImage
} = require("../controllers/complaintController");
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

router.post(
    "/classify-image",
    authenticate,
    authorizeRoles("citizen"),
    upload.single("image"),
    handleUploadError,
    classifyComplaintImage
);

router.get("/my", authenticate, getMyComplaints);

router.get(
    "/",
    authenticate,
    authorizeRoles("authority"),
    getAllComplaints
);

router.get(
    "/stats",
    authenticate,
    authorizeRoles("authority"),
    getComplaintStats
);

router.patch(
    "/:id/status",
    authenticate,
    authorizeRoles("authority"),
    updateComplaintStatus
);

router.patch(
    "/:id/priority",
    authenticate,
    authorizeRoles("authority"),
    updateComplaintPriority
);

router.patch(
    "/:id/assign",
    authenticate,
    authorizeRoles("authority"),
    assignComplaint
);

router.get("/:id", authenticate, getComplaintById);

module.exports = router;
