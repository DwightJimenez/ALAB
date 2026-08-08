const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ==========================================
// 1. DEFINE ALL MODELS FIRST
// ==========================================

const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
  section: { type: DataTypes.STRING, allowNull: true },
  year: { type: DataTypes.STRING, allowNull: true },
  avatar: { type: DataTypes.STRING, allowNull: true },
});

const Inventory = sequelize.define("Inventory", {
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  unit: { type: DataTypes.STRING, allowNull: false },
  totalQuantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
});

const ItemInstance = sequelize.define("ItemInstance", {
  controlNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
  condition: { type: DataTypes.STRING, defaultValue: "Good" },
  expirationDate: { type: DataTypes.DATEONLY, allowNull: true },
  quantity: { type: DataTypes.FLOAT, defaultValue: 1 },
});

const MaterialRequest = sequelize.define("MaterialRequest", {
  amountRequested: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "PENDING" },
  conditionNotes: { type: DataTypes.STRING, allowNull: true },
});

const Skill = sequelize.define("Skill", {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  pL0: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.1 },
  pT: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.2 },
  pG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.25 },
  pS: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.1 },
  masteryThreshold: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.95,
  },
});

const StudentSkill = sequelize.define("StudentSkill", {
  currentPL: { type: DataTypes.FLOAT, allowNull: false },
  isMastered: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const Question = sequelize.define("Question", {
  text: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSON, allowNull: false },
  correctAnswer: { type: DataTypes.STRING, allowNull: false },
});

const StudentAnswer = sequelize.define("StudentAnswer", {
  isCorrect: { type: DataTypes.BOOLEAN, allowNull: false },
});

const LabSession = sequelize.define("LabSession", {
  section: { type: DataTypes.STRING, allowNull: false },
  experimentName: { type: DataTypes.STRING, allowNull: false },
  reservationDate: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.STRING, allowNull: false },
  endTime: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "PENDING" },
});

const ExperimentTemplate = sequelize.define("ExperimentTemplate", {
  title: { type: DataTypes.STRING, allowNull: false },
  materials: { type: DataTypes.JSON, allowNull: false },
  instructionsHTML: { type: DataTypes.TEXT("long"), allowNull: false },
  skillIds: { type: DataTypes.JSON, allowNull: true },
  isGroupSubmission: { type: DataTypes.BOOLEAN, defaultValue: false },
  maxGroupSize: { type: DataTypes.INTEGER, defaultValue: 4 },
});

const ExperimentAssignment = sequelize.define("ExperimentAssignment", {
  yearAndSection: { type: DataTypes.STRING, allowNull: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "ACTIVE" },
  activeSafetyGate: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const LabGroup = sequelize.define("LabGroup", {
  joinCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "FORMING" },
});

const GroupMember = sequelize.define("GroupMember", {
  role: { type: DataTypes.STRING, defaultValue: "MEMBER" },
});

const ExperimentSubmission = sequelize.define("ExperimentSubmission", {
  grade: { type: DataTypes.FLOAT, allowNull: true },
  feedback: { type: DataTypes.TEXT, allowNull: true },
});

const PeerAssessment = sequelize.define("PeerAssessment", {
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  feedback: { type: DataTypes.TEXT, allowNull: true },
});

const Document = sequelize.define("Document", {
  groupId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  data: { type: DataTypes.BLOB("long"), allowNull: true },
});

const ClassSession = sequelize.define("ClassSession", {
  facultyId: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.STRING, allowNull: false },
  section: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.STRING, allowNull: true },
});

const AttendanceRecord = sequelize.define("AttendanceRecord", {
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [["P", "A", "L"]] },
  },
  sessionType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "CLASS",
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

const FacultySection = sequelize.define("FacultySection", {
  year: { type: DataTypes.STRING, allowNull: false },
  section: { type: DataTypes.STRING, allowNull: false },
});

const Subject = sequelize.define("Subject", {
  name: { type: DataTypes.STRING, allowNull: false },
});

// ==========================================
// 2. DEFINE ALL RELATIONSHIPS BELOW
// ==========================================

// --- Inventory & Instances ---
Inventory.hasMany(ItemInstance, {
  foreignKey: "inventoryId",
  as: "instances",
  onDelete: "CASCADE",
});
ItemInstance.belongsTo(Inventory, { foreignKey: "inventoryId" });

// --- Material Requests ---
User.hasMany(MaterialRequest, { foreignKey: "studentId", as: "requests" });
MaterialRequest.belongsTo(User, { foreignKey: "studentId", as: "student" });

Inventory.hasMany(MaterialRequest, {
  foreignKey: "inventoryId",
  as: "requests",
});
MaterialRequest.belongsTo(Inventory, {
  foreignKey: "inventoryId",
  as: "inventory",
});

LabGroup.hasMany(MaterialRequest, {
  foreignKey: "groupId",
  as: "groupRequests",
});
MaterialRequest.belongsTo(LabGroup, { foreignKey: "groupId", as: "group" });

// --- BKT Skills ---
User.belongsToMany(Skill, { through: StudentSkill, foreignKey: "userId" });
Skill.belongsToMany(User, { through: StudentSkill, foreignKey: "skillId" });
User.hasMany(StudentSkill, { foreignKey: "userId" });
StudentSkill.belongsTo(User, { foreignKey: "userId" });
Skill.hasMany(StudentSkill, { foreignKey: "skillId" });
StudentSkill.belongsTo(Skill, { foreignKey: "skillId" });

// --- Questions & Answers ---
Skill.hasMany(Question, { foreignKey: "skillId" });
Question.belongsTo(Skill, { foreignKey: "skillId" });

User.hasMany(StudentAnswer, { foreignKey: "userId" });
StudentAnswer.belongsTo(User, { foreignKey: "userId" });
Question.hasMany(StudentAnswer, { foreignKey: "questionId" });
StudentAnswer.belongsTo(Question, { foreignKey: "questionId" });

// --- Lab Sessions ---
User.hasMany(LabSession, { foreignKey: "facultyId", as: "labSessions" });
LabSession.belongsTo(User, { foreignKey: "facultyId", as: "faculty" });
LabSession.hasMany(LabGroup, { foreignKey: "labSessionId", as: "groups" });
LabGroup.belongsTo(LabSession, { foreignKey: "labSessionId", as: "session" });

// --- Experiments ---
User.hasMany(ExperimentTemplate, {
  foreignKey: "facultyId",
  as: "experiments",
});
ExperimentTemplate.belongsTo(User, { foreignKey: "facultyId", as: "faculty" });

ExperimentTemplate.hasMany(ExperimentAssignment, {
  foreignKey: "templateId",
  as: "assignments",
  onDelete: "CASCADE",
});
ExperimentAssignment.belongsTo(ExperimentTemplate, {
  foreignKey: "templateId",
  as: "template",
});

ExperimentAssignment.hasMany(LabGroup, {
  foreignKey: "assignmentId",
  as: "groups",
});
LabGroup.belongsTo(ExperimentAssignment, {
  foreignKey: "assignmentId",
  as: "assignment",
});

// --- Lab Groups & Members ---
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
User.hasMany(GroupMember, { foreignKey: "userId" });
GroupMember.belongsTo(User, { foreignKey: "userId" });
LabGroup.hasMany(GroupMember, { foreignKey: "groupId" });
GroupMember.belongsTo(LabGroup, { foreignKey: "groupId" });

// --- Submissions ---
LabGroup.hasOne(ExperimentSubmission, {
  foreignKey: "groupId",
  as: "submission",
});
ExperimentSubmission.belongsTo(LabGroup, {
  foreignKey: "groupId",
  as: "group",
});

// --- Peer Assessments ---
LabGroup.hasMany(PeerAssessment, {
  foreignKey: "groupId",
  as: "peerAssessments",
});
PeerAssessment.belongsTo(LabGroup, { foreignKey: "groupId", as: "group" });
User.hasMany(PeerAssessment, {
  foreignKey: "evaluatorId",
  as: "assessmentsGiven",
});
PeerAssessment.belongsTo(User, { foreignKey: "evaluatorId", as: "evaluator" });
User.hasMany(PeerAssessment, {
  foreignKey: "evaluateeId",
  as: "assessmentsReceived",
});
PeerAssessment.belongsTo(User, { foreignKey: "evaluateeId", as: "evaluatee" });

// --- Documents ---
LabGroup.hasOne(Document, {
  foreignKey: "groupId",
  as: "document",
  onDelete: "CASCADE",
});
Document.belongsTo(LabGroup, { foreignKey: "groupId", as: "group" });

// =======================================================
// --- CLASS SESSIONS, LAB SESSIONS, & ATTENDANCE ---
// =======================================================
ClassSession.belongsTo(User, {
  foreignKey: "facultyId",
  as: "faculty",
});

// 1. Link Attendance to Class Sessions
ClassSession.hasMany(AttendanceRecord, {
  foreignKey: "sessionId",
  as: "attendanceRecords",
  constraints: false,
  scope: { sessionType: "CLASS" },
});

AttendanceRecord.belongsTo(ClassSession, {
  foreignKey: "sessionId",
  as: "classSession",
  constraints: false,
});

// 2. Link Attendance to Lab Sessions
LabSession.hasMany(AttendanceRecord, {
  foreignKey: "sessionId",
  as: "labAttendanceRecords",
  constraints: false,
  scope: { sessionType: "LAB" },
});

AttendanceRecord.belongsTo(LabSession, {
  foreignKey: "sessionId",
  as: "labSession",
  constraints: false,
});

// 3. Link Attendance to Students
User.hasMany(AttendanceRecord, { foreignKey: "studentId", as: "attendances" });
AttendanceRecord.belongsTo(User, { foreignKey: "studentId", as: "student" });

// --- Faculty Sections ---
User.hasMany(FacultySection, {
  foreignKey: "facultyId",
  as: "handledSections",
  onDelete: "CASCADE",
});
FacultySection.belongsTo(User, {
  foreignKey: "facultyId",
  as: "faculty",
});

// --- SUBJECTS ---
Subject.hasMany(FacultySection, {
  foreignKey: "subjectId",
  as: "facultySections",
  onDelete: "CASCADE",
});
FacultySection.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });

Subject.hasMany(ClassSession, { foreignKey: "subjectId", as: "classSessions" });
ClassSession.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });

Subject.hasMany(LabSession, { foreignKey: "subjectId", as: "labSessions" });
LabSession.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });

Subject.hasMany(ExperimentTemplate, {
  foreignKey: "subjectId",
  as: "experiments",
});
ExperimentTemplate.belongsTo(Subject, {
  foreignKey: "subjectId",
  as: "subject",
});

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
  PeerAssessment,
  Document,
  ClassSession,
  AttendanceRecord,
  FacultySection,
  Subject,
};
