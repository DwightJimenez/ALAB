const express = require("express");
const { sequelize, Inventory, User, MaterialRequest } = require("./models");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
require("dotenv").config();
app.use(cookieParser());
const cors = require("cors");

const allowedOrigins = [
  "http://localhost:5173",
  `${process.env.LOCAL_URL}`,
  `${process.env.CORS_URL}`,
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});


app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected to WebSockets:", socket.id);

  socket.on("join_lobby_room", (joinCode) => {
    socket.join(joinCode);
    console.log(`Socket ${socket.id} joined room ${joinCode}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


const authRoutes = require("./routes/auth");
app.use("/api", authRoutes);
const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);
const inventoryRoutes = require("./routes/inventory");
app.use("/api/inventory", inventoryRoutes);
const quizRoutes = require("./routes/quiz");
app.use("/api/quiz", quizRoutes);
const skillRoutes = require("./routes/skills");
app.use("/api/skills", skillRoutes);
const requestRoutes = require("./routes/requests");
app.use("/api/requests", requestRoutes);
const sessionRoutes = require("./routes/sessions");
app.use("/api/sessions", sessionRoutes);
const experimentRoutes = require("./routes/experiments");
app.use("/api/experiments", experimentRoutes);
const wikiRoutes = require("./routes/wiki");
app.use("/api/wiki", wikiRoutes);
const adminOverviewRoutes = require("./routes/adminOverview");
app.use("/api/admin", adminOverviewRoutes);
const groupRoutes = require("./routes/group");
app.use("/api/group", groupRoutes);

const PORT = process.env.PORT || 5000;

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database synced successfully.");
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`ALAB Backend (HTTP & WebSockets) listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
  });