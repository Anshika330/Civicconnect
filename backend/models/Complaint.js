const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["Point"],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: function (coordinates) {
                    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
                        return false;
                    }

                    const [longitude, latitude] = coordinates;
                    return longitude >= -180 &&
                        longitude <= 180 &&
                        latitude >= -90 &&
                        latitude <= 90;
                },
                message: "Coordinates must be [longitude, latitude] with valid ranges"
            }
        }
    },
    { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved", "Rejected"],
            required: true
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { _id: false }
);

const complaintSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: ["Road", "Garbage", "Water", "Streetlight", "Other"]
        },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Reported user is required"]
        },
        location: {
            type: locationSchema,
            required: false
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved", "Rejected"],
            default: "Pending"
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium"
        },
        image: {
            url: {
                type: String,
                trim: true
            },
            publicId: {
                type: String,
                trim: true
            }
        },
        assignedDepartment: {
            type: String,
            enum: [
                "Public Works Department",
                "Sanitation Department",
                "Water Department",
                "Electrical Department",
                "General Department"
            ],
            default: null
        },
        assignedAt: {
            type: Date,
            default: null
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        isPossibleDuplicate: {
            type: Boolean,
            default: false
        },
        duplicateOf: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Complaint",
            default: null
        },
        statusHistory: {
            type: [statusHistorySchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

complaintSchema.index({ location: "2dsphere" });

const Complaint = mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;
