
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const connectDB = require("./config/db");
const initializeSocket = require("./config/socket");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const complaintRoutes = require("./routes/complaintRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to CivicConnect API!"
    });
});

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
const io = initializeSocket(httpServer);
app.set("io", io);

const startServer = async () => {
    try {
        await connectDB();

        httpServer.on("error", (error) => {
            if (error.code === "EADDRINUSE") {
                console.error(`Server startup failed: port ${PORT} is already in use`);
            } else {
                console.error("Server startup failed:", error.message);
            }

            httpServer.close();
            process.exit(1);
        });

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
