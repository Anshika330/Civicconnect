const User = require("../models/users");

const registerCitizen = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password and phone are required"
            });
        }

        const normalizedName = String(name).trim();
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedPhone = String(phone).trim();

        if (!normalizedName || !normalizedEmail || !normalizedPhone) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password and phone are required"
            });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists"
            });
        }

        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password,
            phone: normalizedPhone,
            role: "citizen"
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(201).json({
            success: true,
            message: "Citizen registered successfully",
            data: {
                user: userResponse
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists"
            });
        }

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((item) => item.message);
            return res.status(400).json({
                success: false,
                message: messages.join(", ")
            });
        }

        console.error("Citizen registration failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to register citizen"
        });
    }
};

module.exports = { registerCitizen };
