const express = require("express");
const { sequelize, Inventory, User, MaterialRequest } = require("./models");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
require("dotenv").config();
app.use(cookieParser());
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

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

const PORT = process.env.PORT || 5000;

sequelize
  .sync({ alter: true }) // 'alter: true' updates tables if you change the model
  .then(() => {
    console.log("Database synced successfully.");
    app.listen(PORT, () => {
      console.log(`ALAB Backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
  });
