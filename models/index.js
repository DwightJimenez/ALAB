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
  materials: { type: DataTypes.JSON, allowNull: false },
  instructionsHTML: { type: DataTypes.TEXT("long"), allowNull: false },
  skillId: { type: DataTypes.INTEGER, allowNull: true },
  isGroupSubmission: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  maxGroupSize: {
    type: DataTypes.INTEGER,
    defaultValue: 4,
  },
});

// A faculty member (User) creates many Experiment Templates
User.hasMany(ExperimentTemplate, {
  foreignKey: "facultyId",
  as: "experiments",
});
ExperimentTemplate.belongsTo(User, { foreignKey: "facultyId", as: "faculty" });

// --- EXPERIMENT ASSIGNMENT MODEL ---
const ExperimentAssignment = sequelize.define("ExperimentAssignment", {
  yearAndSection: { type: DataTypes.STRING, allowNull: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "ACTIVE" },
  activeSafetyGate: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// A template can be assigned many times
ExperimentTemplate.hasMany(ExperimentAssignment, {
  foreignKey: "templateId",
  as: "assignments",
});
ExperimentAssignment.belongsTo(ExperimentTemplate, {
  foreignKey: "templateId",
  as: "template",
});

// ==========================================
// GROUP SUBMISSION & SHARED CART ---
// ==========================================

// 1. Lab Group (The temporary session group)
const LabGroup = sequelize.define("LabGroup", {
  joinCode: { type: DataTypes.STRING, unique: true, allowNull: false }, // QR payload or 6-digit Kahoot-style PIN
  status: { type: DataTypes.STRING, defaultValue: "FORMING" }, // States: "FORMING", "ACTIVE", "SUBMITTED", "CLEARED"
});

// 2. Group Member (Junction Table for Users <-> LabGroups)
const GroupMember = sequelize.define("GroupMember", {
  role: { type: DataTypes.STRING, defaultValue: "MEMBER" }, // "LEADER" or "MEMBER"
});

// 3. Experiment Submission
const ExperimentSubmission = sequelize.define("ExperimentSubmission", {
  submissionData: { type: DataTypes.JSON, allowNull: false }, // Stores the filled-out Blocknote data
  grade: { type: DataTypes.FLOAT, allowNull: true },
  feedback: { type: DataTypes.TEXT, allowNull: true },
});

// 4. Group Cart Item (Junction Table for LabGroups <-> ItemInstances)
// Handles real-time borrowing of specific physical pieces
const GroupCartItem = sequelize.define("GroupCartItem", {
  status: { type: DataTypes.STRING, defaultValue: "PENDING" }, // States: "PENDING", "DISPENSED", "RETURNED", "DAMAGED"
  conditionNotes: { type: DataTypes.STRING, allowNull: true }, // e.g., "chipped rim upon return"
});

// --- DEFINE NEW RELATIONSHIPS ---

// Link Group to the physical Lab Session & the academic Assignment
LabSession.hasMany(LabGroup, { foreignKey: "labSessionId", as: "groups" });
LabGroup.belongsTo(LabSession, { foreignKey: "labSessionId", as: "session" });

ExperimentAssignment.hasMany(LabGroup, {
  foreignKey: "assignmentId",
  as: "groups",
});
LabGroup.belongsTo(ExperimentAssignment, {
  foreignKey: "assignmentId",
  as: "assignment",
});

// Link Users to Groups (Many-to-Many via GroupMember)
User.belongsToMany(LabGroup, {
  through: GroupMember,
  foreignKey: "userId",
  as: "labGroups",
});
LabGroup.belongsToMany(User, {
  through: GroupMember,
  foreignKey: "groupId",
  as: "members",
});

// (Optional but recommended) Explicit HasMany/BelongsTo for the Junction Table
// This makes eager loading roles (like checking who the LEADER is) much easier
User.hasMany(GroupMember, { foreignKey: "userId" });
GroupMember.belongsTo(User, { foreignKey: "userId" });
LabGroup.hasMany(GroupMember, { foreignKey: "groupId" });
GroupMember.belongsTo(LabGroup, { foreignKey: "groupId" });

// Link Group to Submission (One-to-One)
LabGroup.hasOne(ExperimentSubmission, {
  foreignKey: "groupId",
  as: "submission",
});
ExperimentSubmission.belongsTo(LabGroup, {
  foreignKey: "groupId",
  as: "group",
});

// Link Group to Physical Items for Checkout (Many-to-Many via GroupCartItem)
// Notice this links to ItemInstance (the physical piece), NOT the general Inventory
LabGroup.belongsToMany(ItemInstance, {
  through: GroupCartItem,
  foreignKey: "groupId",
  as: "borrowedItems",
});
ItemInstance.belongsToMany(LabGroup, {
  through: GroupCartItem,
  foreignKey: "itemInstanceId",
  as: "borrowedByGroups",
});


const Document = sequelize.define("Document", {
  data: {
    type: DataTypes.BLOB("long"), 
    allowNull: true,
  },
});

LabGroup.hasOne(Document, { foreignKey: "groupId", as: "document", onDelete: "CASCADE" });
Document.belongsTo(LabGroup, { foreignKey: "groupId", as: "group" });

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
  LabGroup,
  GroupMember,
  ExperimentSubmission,
  GroupCartItem,
  Document
};
