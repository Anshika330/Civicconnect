const Complaint = require("../models/Complaint");
const cloudinary = require("../config/cloudinary");

const allowedCategories = ["Road", "Garbage", "Water", "Streetlight", "Other"];

const createComplaint = async (req, res) => {
    try {
        let { title, description, category, location } = req.body || {};

        if (typeof location === "string") {
            try {
                location = JSON.parse(location);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid location format"
                });
            }
        }

        if (!title || !description || !category) {
            return res.status(400).json({
                success: false,
                message: "Title, description and category are required"
            });
        }

        const trimmedTitle = String(title).trim();
        const trimmedDescription = String(description).trim();

        if (!trimmedTitle || !trimmedDescription) {
            return res.status(400).json({
                success: false,
                message: "Title, description and category are required"
            });
        }

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint category"
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const complaintData = {
            title: trimmedTitle,
            description: trimmedDescription,
            category,
            reportedBy: req.user.id
        };

        if (location !== undefined) {
            if (
                !location ||
                location.type !== "Point" ||
                !Array.isArray(location.coordinates) ||
                location.coordinates.length !== 2
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Location must be a Point with [longitude, latitude] coordinates"
                });
            }

            const [longitude, latitude] = location.coordinates;
            if (
                typeof longitude !== "number" ||
                typeof latitude !== "number" ||
                !Number.isFinite(longitude) ||
                !Number.isFinite(latitude) ||
                longitude < -180 ||
                longitude > 180 ||
                latitude < -90 ||
                latitude > 90
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid location coordinates"
                });
            }

            complaintData.location = {
                type: "Point",
                coordinates: [longitude, latitude]
            };
        }

        if (req.file) {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (!cloudName || !apiKey || !apiSecret) {
                return res.status(500).json({
                    success: false,
                    message: "Cloudinary is not configured"
                });
            }

            let uploadResult;
            try {
                uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: "civicconnect/complaints",
                            resource_type: "image"
                        },
                        (error, result) => {
                            if (error) {
                                return reject(error);
                            }
                            resolve(result);
                        }
                    );

                    uploadStream.end(req.file.buffer);
                });
            } catch (error) {
                return res.status(502).json({
                    success: false,
                    message: "Unable to upload complaint image"
                });
            }

            complaintData.image = {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id
            };
        }

        const complaint = await Complaint.create(complaintData);

        return res.status(201).json({
            success: true,
            message: "Complaint created successfully",
            data: {
                complaint
            }
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((item) => item.message);
            return res.status(400).json({
                success: false,
                message: messages.join(", ")
            });
        }

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint data"
            });
        }

        console.error("Complaint creation failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to create complaint"
        });
    }
};

module.exports = { createComplaint };
