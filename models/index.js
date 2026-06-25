const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// 1. User Model
const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
});

// 2. Inventory Model
const Inventory = sequelize.define("Inventory", {
  itemName: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  hazardLevel: { type: DataTypes.STRING, allowNull: false },
  expiryDate: { type: DataTypes.DATE, allowNull: true },
});

// 3. Material Request Model
const MaterialRequest = sequelize.define("MaterialRequest", {
  amountRequested: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "PENDING" }, // "PENDING", "APPROVED", "REJECTED"
});

// --- DEFINE RELATIONSHIPS ---

// A User (Student) can have many Material Requests
User.hasMany(MaterialRequest, { foreignKey: "studentId" });
MaterialRequest.belongsTo(User, { foreignKey: "studentId" });

// An Inventory item can be part of many Material Requests
Inventory.hasMany(MaterialRequest, { foreignKey: "inventoryId" });
MaterialRequest.belongsTo(Inventory, { foreignKey: "inventoryId" });

module.exports = { sequelize, User, Inventory, MaterialRequest };
