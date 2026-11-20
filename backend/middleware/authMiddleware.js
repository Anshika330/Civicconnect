const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const token = authorizationHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({
            success: false,
            message: "Authentication service is unavailable"
        });
    }

    try {
        const decodedUser = jwt.verify(token, jwtSecret);
        req.user = decodedUser;
        return next();
    } catch (error) {
        const message = error.name === "TokenExpiredError"
            ? "Authentication token has expired"
            : "Invalid authentication token";

        return res.status(401).json({
            success: false,
            message
        });
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource"
            });
        }

        return next();
    };
};

module.exports = { authenticate, authorizeRoles };
