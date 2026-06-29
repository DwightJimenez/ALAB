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
  controlNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  unit: { type: DataTypes.STRING, allowNull: false },
  expirationDate: { type: DataTypes.DATEONLY, allowNull: true },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
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

// --- BKT MODEL 1: The Skills & Parameters ---
const Skill = sequelize.define("Skill", {
  name: { type: DataTypes.STRING, allowNull: false, unique: true }, // e.g., "Chemical Spills"
  description: { type: DataTypes.TEXT },

  // The 4 BKT Parameters (Stored as decimals between 0.0 and 1.0)
  pL0: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.1 }, // Initial Knowledge
  pT: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.2 }, // Learn Rate
  pG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.25 }, // Guess Rate
  pS: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.1 }, // Slip Rate

  // The target probability required to unlock lab access
  masteryThreshold: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.95,
  },
});

// --- BKT MODEL 2: The Student's Live Progress ---
const StudentSkill = sequelize.define("StudentSkill", {
  // This tracks their live P(L) updating after every question
  currentPL: { type: DataTypes.FLOAT, allowNull: false },
  isMastered: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// --- DEFINE RELATIONSHIPS ---

// Many-to-Many connection between Users and Skills
User.belongsToMany(Skill, { through: StudentSkill, foreignKey: "userId" });
Skill.belongsToMany(User, { through: StudentSkill, foreignKey: "skillId" });

// One-to-Many direct connections (Makes querying much easier later)
User.hasMany(StudentSkill, { foreignKey: "userId" });
StudentSkill.belongsTo(User, { foreignKey: "userId" });

Skill.hasMany(StudentSkill, { foreignKey: "skillId" });
StudentSkill.belongsTo(Skill, { foreignKey: "skillId" });


// --- THE REAL QUIZ QUESTIONS ---
const Question = sequelize.define('Question', {
  text: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSON, allowNull: false }, // Stores an array of choices like ["A", "B", "C", "D"]
  correctAnswer: { type: DataTypes.STRING, allowNull: false }
});

// ... (Scroll down to your Relationships section and add this):
Skill.hasMany(Question, { foreignKey: 'skillId' });
Question.belongsTo(Skill, { foreignKey: 'skillId' });
// Export all models
module.exports = { sequelize, User, Inventory, Skill, StudentSkill, Question };
