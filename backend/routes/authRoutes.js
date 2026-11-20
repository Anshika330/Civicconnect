const express = require("express");
const { registerCitizen } = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerCitizen);

module.exports = router;
