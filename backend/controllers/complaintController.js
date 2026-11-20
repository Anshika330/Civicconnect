const Complaint = require("../models/Complaint");
const cloudinary = require("../config/cloudinary");
const mongoose = require("mongoose");

const allowedCategories = ["Road", "Garbage", "Water", "Streetlight", "Other"];
const allowedStatuses = ["Pending", "In Progress", "Resolved", "Rejected"];
const allowedPriorities = ["Low", "Medium", "High", "Critical"];
const allowedDepartments = [
    "Public Works Department",
    "Sanitation Department",
    "Water Department",
    "Electrical Department",
    "General Department"
];

const parsePagination = (query) => {
    if (
        (query.page !== undefined && typeof query.page !== "string") ||
        (query.limit !== undefined && typeof query.limit !== "string")
    ) {
        return null;
    }

    const pageValue = query.page === undefined ? 1 : Number(query.page);
    const limitValue = query.limit === undefined ? 10 : Number(query.limit);

    if (
        !Number.isInteger(pageValue) ||
        pageValue < 1 ||
        !Number.isInteger(limitValue) ||
        limitValue < 1 ||
        limitValue > 100
    ) {
        return null;
    }

    return { page: pageValue, limit: limitValue };
};

const buildFilterQuery = (query) => {
    const filter = {};

    if (query.status !== undefined) {
        if (!allowedStatuses.includes(query.status)) {
            return { error: "Invalid status filter" };
        }
        filter.status = query.status;
    }

    if (query.category !== undefined) {
        if (!allowedCategories.includes(query.category)) {
            return { error: "Invalid category filter" };
        }
        filter.category = query.category;
    }

    if (query.priority !== undefined) {
        if (!allowedPriorities.includes(query.priority)) {
            return { error: "Invalid priority filter" };
        }
        filter.priority = query.priority;
    }

    return { filter };
};

const paginationResponse = (res, complaints, total, page, limit) => {
    return res.status(200).json({
        success: true,
        data: {
            complaints,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }
    });
};

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

const getMyComplaints = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const pagination = parsePagination(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                message: "Page must be a positive integer and limit must be between 1 and 100"
            });
        }

        const filter = buildFilterQuery(req.query);
        if (filter.error) {
            return res.status(400).json({
                success: false,
                message: filter.error
            });
        }

        const query = {
            ...filter.filter,
            reportedBy: req.user.id
        };
        const skip = (pagination.page - 1) * pagination.limit;

        const [complaints, total] = await Promise.all([
            Complaint.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pagination.limit)
                .lean(),
            Complaint.countDocuments(query)
        ]);

        return paginationResponse(
            res,
            complaints,
            total,
            pagination.page,
            pagination.limit
        );
    } catch (error) {
        console.error("Complaint listing failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaints"
        });
    }
};

const getAllComplaints = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                message: "Page must be a positive integer and limit must be between 1 and 100"
            });
        }

        const filterResult = buildFilterQuery(req.query);
        if (filterResult.error) {
            return res.status(400).json({
                success: false,
                message: filterResult.error
            });
        }

        const skip = (pagination.page - 1) * pagination.limit;
        const [complaints, total] = await Promise.all([
            Complaint.find(filterResult.filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pagination.limit)
                .lean(),
            Complaint.countDocuments(filterResult.filter)
        ]);

        return paginationResponse(
            res,
            complaints,
            total,
            pagination.page,
            pagination.limit
        );
    } catch (error) {
        console.error("Complaint listing failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaints"
        });
    }
};

const getComplaintStats = async (req, res) => {
    try {
        const [aggregateStats, categoryStats] = await Promise.all([
            Complaint.aggregate([
                {
                    $facet: {
                        total: [
                            { $count: "count" }
                        ],
                        status: [
                            { $group: { _id: "$status", count: { $sum: 1 } } }
                        ],
                        priority: [
                            { $group: { _id: "$priority", count: { $sum: 1 } } }
                        ]
                    }
                }
            ]),
            Complaint.aggregate([
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const stats = aggregateStats[0] || {
            total: [],
            status: [],
            priority: []
        };

        const statusCounts = Object.fromEntries(
            allowedStatuses.map((status) => [status, 0])
        );
        for (const item of stats.status) {
            if (Object.prototype.hasOwnProperty.call(statusCounts, item._id)) {
                statusCounts[item._id] = item.count;
            }
        }

        const priorityCounts = Object.fromEntries(
            allowedPriorities.map((priority) => [priority, 0])
        );
        for (const item of stats.priority) {
            if (Object.prototype.hasOwnProperty.call(priorityCounts, item._id)) {
                priorityCounts[item._id] = item.count;
            }
        }

        const categoryCounts = Object.fromEntries(
            allowedCategories.map((category) => [category, 0])
        );
        for (const item of categoryStats) {
            if (Object.prototype.hasOwnProperty.call(categoryCounts, item._id)) {
                categoryCounts[item._id] = item.count;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                total: stats.total[0]?.count || 0,
                status: statusCounts,
                priority: priorityCounts,
                category: categoryCounts
            }
        });
    } catch (error) {
        console.error("Complaint statistics retrieval failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaint statistics"
        });
    }
};

const getComplaintById = async (req, res) => {
    try {
        const { id } = req.params;

        if (
            typeof id !== "string" ||
            !/^[a-fA-F0-9]{24}$/.test(id) ||
            !mongoose.Types.ObjectId.isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint ID"
            });
        }

        const complaint = await Complaint.findById(id).lean();
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found"
            });
        }

        if (
            req.user.role === "citizen" &&
            String(complaint.reportedBy) !== String(req.user.id)
        ) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this complaint"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                complaint
            }
        });
    } catch (error) {
        console.error("Complaint retrieval failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaint"
        });
    }
};

const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};

        if (
            typeof id !== "string" ||
            !/^[a-fA-F0-9]{24}$/.test(id) ||
            !mongoose.Types.ObjectId.isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint ID"
            });
        }

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Allowed statuses are Pending, In Progress, Resolved, Rejected"
            });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Complaint status updated successfully",
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

        console.error("Complaint status update failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update complaint status"
        });
    }
};

const updateComplaintPriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body || {};

        if (
            typeof id !== "string" ||
            !/^[a-fA-F0-9]{24}$/.test(id) ||
            !mongoose.Types.ObjectId.isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint ID"
            });
        }

        if (!priority || !allowedPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Invalid priority. Allowed priorities are Low, Medium, High, Critical"
            });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            { priority },
            { new: true, runValidators: true }
        );

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Complaint priority updated successfully",
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

        console.error("Complaint priority update failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update complaint priority"
        });
    }
};

const assignComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { department } = req.body || {};

        if (
            typeof id !== "string" ||
            !/^[a-fA-F0-9]{24}$/.test(id) ||
            !mongoose.Types.ObjectId.isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint ID"
            });
        }

        if (!department || !allowedDepartments.includes(department)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing department"
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            {
                assignedDepartment: department,
                assignedAt: new Date(),
                assignedBy: req.user.id
            },
            { new: true, runValidators: true }
        );

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Complaint assigned successfully",
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
                message: "Invalid complaint assignment data"
            });
        }

        console.error("Complaint assignment failed:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to assign complaint"
        });
    }
};

module.exports = {
    createComplaint,
    getMyComplaints,
    getAllComplaints,
    getComplaintStats,
    getComplaintById,
    updateComplaintStatus,
    updateComplaintPriority,
    assignComplaint
};
