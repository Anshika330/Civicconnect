const express = require("express");
const { createComplaint } = require("../controllers/complaintController");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/",
    authenticate,
    authorizeRoles("citizen"),
    createComplaint
);

module.exports = router;
