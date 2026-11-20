const express = require("express");
const {
    createComplaint,
    getMyComplaints,
    getAllComplaints,
    getComplaintById,
    updateComplaintStatus,
    updateComplaintPriority
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

router.get("/my", authenticate, getMyComplaints);

router.get(
    "/",
    authenticate,
    authorizeRoles("authority"),
    getAllComplaints
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

router.get("/:id", authenticate, getComplaintById);

module.exports = router;
