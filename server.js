const express = require('express');
const { sequelize, Inventory, User, MaterialRequest } = require('./models');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json()); 
require('dotenv').config();
app.use(cookieParser());
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Example API Route: Get all inventory items
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await Inventory.findAll(); // Sequelize's equivalent to SELECT *
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Example API Route: Create a new material request
app.post('/api/requests', async (req, res) => {
  try {
    const { studentId, inventoryId, amountRequested } = req.body;
    const newRequest = await MaterialRequest.create({
      studentId,
      inventoryId,
      amountRequested
    });
    res.json(newRequest);
  } catch (error) {
    res.status(500).json({ error: "Failed to submit request" });
  }
});

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }) // 'alter: true' updates tables if you change the model
  .then(() => {
    console.log("Database synced successfully.");
    app.listen(PORT, () => {
      console.log(`ALAB Backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
  });