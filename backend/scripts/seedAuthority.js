const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("../models/users");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const seedAuthority = async () => {
    const name = process.env.AUTHORITY_NAME?.trim();
    const email = process.env.AUTHORITY_EMAIL?.trim().toLowerCase();
    const password = process.env.AUTHORITY_PASSWORD;
    const mongoUri = process.env.MONGO_URI;

    if (!name || !email || !password) {
        throw new Error(
            "AUTHORITY_NAME, AUTHORITY_EMAIL, and AUTHORITY_PASSWORD must be configured"
        );
    }

    if (password.length < 8) {
        throw new Error("AUTHORITY_PASSWORD must be at least 8 characters long");
    }

    if (!mongoUri) {
        throw new Error("MONGO_URI must be configured");
    }

    await mongoose.connect(mongoUri);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        if (existingUser.role === "authority") {
            console.log("Authority account already exists; no changes made.");
            return;
        }

        throw new Error(
            "The configured email belongs to a citizen account; it was not promoted"
        );
    }

    await User.create({
        name,
        email,
        password,
        role: "authority"
    });

    console.log("Authority account created successfully.");
};

seedAuthority()
    .catch((error) => {
        console.error("Authority seed failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
