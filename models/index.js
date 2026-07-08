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
  section: { type: DataTypes.STRING, allowNull: true },
  year: { type: DataTypes.STRING, allowNull: true },
});

// 2A. Inventory Model (The Catalog / Master List)
const Inventory = sequelize.define("Inventory", {
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  unit: { type: DataTypes.STRING, allowNull: false },
  totalQuantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
});

// 2B. Item Instance Model (The Physical Pieces)
const ItemInstance = sequelize.define("ItemInstance", {
  controlNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
  condition: { type: DataTypes.STRING, defaultValue: "Good" },
  expirationDate: { type: DataTypes.DATEONLY, allowNull: true },
  quantity: { type: DataTypes.FLOAT, defaultValue: 1 },
});

// --- RELATIONSHIPS ---
Inventory.hasMany(ItemInstance, {
  foreignKey: "inventoryId",
  as: "instances",
  onDelete: "CASCADE",
});
ItemInstance.belongsTo(Inventory, { foreignKey: "inventoryId" });

// 3. Material Request Model
const MaterialRequest = sequelize.define("MaterialRequest", {
  amountRequested: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "PENDING" }, // "PENDING", "APPROVED", "REJECTED"
});

// --- DEFINE RELATIONSHIPS ---
User.hasMany(MaterialRequest, { foreignKey: "studentId", as: "requests" });
MaterialRequest.belongsTo(User, { foreignKey: "studentId", as: "student" }); // <--- Added as: "student"

// An Inventory item can be part of many Material Requests
Inventory.hasMany(MaterialRequest, {
  foreignKey: "inventoryId",
  as: "requests",
});
MaterialRequest.belongsTo(Inventory, {
  foreignKey: "inventoryId",
  as: "inventory",
});

// --- BKT MODEL 1: The Skills & Parameters ---
const Skill = sequelize.define("Skill", {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },

  // The 4 BKT Parameters (Stored as decimals between 0.0 and 1.0)
  pL0: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.1 }, // Initial Knowledge
  pT: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.2 }, // Learn Rate
  pG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.25 }, // Guess Rate
  pS: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.1 }, // Slip Rate

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

User.belongsToMany(Skill, { through: StudentSkill, foreignKey: "userId" });
Skill.belongsToMany(User, { through: StudentSkill, foreignKey: "skillId" });

User.hasMany(StudentSkill, { foreignKey: "userId" });
StudentSkill.belongsTo(User, { foreignKey: "userId" });

Skill.hasMany(StudentSkill, { foreignKey: "skillId" });
StudentSkill.belongsTo(Skill, { foreignKey: "skillId" });

// --- THE REAL QUIZ QUESTIONS ---
const Question = sequelize.define("Question", {
  text: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSON, allowNull: false }, // Stores an array of choices like ["A", "B", "C", "D"]
  correctAnswer: { type: DataTypes.STRING, allowNull: false },
});

Skill.hasMany(Question, { foreignKey: "skillId" });
Question.belongsTo(Skill, { foreignKey: "skillId" });

// --- BKT MODEL 3: Answer History ---
const StudentAnswer = sequelize.define("StudentAnswer", {
  isCorrect: { type: DataTypes.BOOLEAN, allowNull: false },
});

User.hasMany(StudentAnswer, { foreignKey: "userId" });
StudentAnswer.belongsTo(User, { foreignKey: "userId" });

Question.hasMany(StudentAnswer, { foreignKey: "questionId" });
StudentAnswer.belongsTo(Question, { foreignKey: "questionId" });

const LabSession = sequelize.define("LabSession", {
  section: { type: DataTypes.STRING, allowNull: false },
  experimentName: { type: DataTypes.STRING, allowNull: false },
  reservationDate: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.STRING, allowNull: false },
  endTime: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "PENDING" },
});

// --- DEFINE RELATIONSHIPS FOR LAB SESSION ---
User.hasMany(LabSession, { foreignKey: "facultyId", as: "labSessions" });
LabSession.belongsTo(User, { foreignKey: "facultyId", as: "faculty" });

// Experiment
const ExperimentTemplate = sequelize.define("ExperimentTemplate", {
  title: { type: DataTypes.STRING, allowNull: false },
  objective: { type: DataTypes.TEXT },
  // We use JSON to easily store the dynamic array of materials
  materials: { type: DataTypes.JSON, allowNull: false },
  // We use TEXT("long") to store the rich HTML generated by BlockNote
  instructionsHTML: { type: DataTypes.TEXT("long"), allowNull: false },
});

// A faculty member (User) creates many Experiment Templates
User.hasMany(ExperimentTemplate, {
  foreignKey: "facultyId",
  as: "experiments",
});
ExperimentTemplate.belongsTo(User, { foreignKey: "facultyId", as: "faculty" });

// --- EXPERIMENT ASSIGNMENT MODEL ---
const ExperimentAssignment = sequelize.define("ExperimentAssignment", {
  yearAndSection: { type: DataTypes.STRING, allowNull: false }, // e.g., "3rd Year - BSCS A"
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "ACTIVE" }, // ACTIVE or CLOSED
});

// A template can be assigned many times
ExperimentTemplate.hasMany(ExperimentAssignment, { foreignKey: "templateId", as: "assignments" });
ExperimentAssignment.belongsTo(ExperimentTemplate, { foreignKey: "templateId", as: "template" });

module.exports = {
  sequelize,
  User,
  Inventory,
  ItemInstance,
  MaterialRequest,
  Skill,
  StudentSkill,
  Question,
  StudentAnswer,
  LabSession,
  ExperimentTemplate,
  ExperimentAssignment,
};
