const express = require("express");
const { registerCitizen, login } = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerCitizen);
router.post("/login", login);

module.exports = router;
