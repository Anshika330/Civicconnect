const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const initializeSocket = (httpServer) => {
    const allowedOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ];

    if (process.env.FRONTEND_URL) {
        const configuredOrigin = process.env.FRONTEND_URL.trim().replace(/\/$/, "");
        if (configuredOrigin) {
            allowedOrigins.push(configuredOrigin);
        }
    }

    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                return callback(new Error("Origin is not allowed"));
            },
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use((socket, next) => {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

        if (!token) {
            return next(new Error("Authentication required"));
        }

        if (!process.env.JWT_SECRET) {
            return next(new Error("Authentication service unavailable"));
        }

        try {
            const decodedUser = jwt.verify(token, process.env.JWT_SECRET);

            if (!decodedUser.id) {
                return next(new Error("Invalid authentication token"));
            }

            if (
                decodedUser.role !== "citizen" &&
                decodedUser.role !== "authority"
            ) {
                return next(new Error("Invalid authentication role"));
            }

            socket.user = {
                id: decodedUser.id,
                role: decodedUser.role
            };
            return next();
        } catch (error) {
            return next(new Error("Invalid or expired authentication token"));
        }
    });

    io.on("connection", (socket) => {
        if (socket.user.role === "authority") {
            socket.join("authorities");
        }

        if (socket.user.role === "citizen") {
            socket.join(`citizen:${socket.user.id}`);
        }
    });

    return io;
};

module.exports = initializeSocket;
