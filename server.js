const express = require("express");
const { sequelize, Document, LabGroup, GroupMember } = require("./models");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const { Hocuspocus } = require("@hocuspocus/server");
const { Database } = require("@hocuspocus/extension-database");
const crossws = require("crossws/adapters/node");
const jwt = require("jsonwebtoken");

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
  console.log("User connected to Socket.IO:", socket.id);

  socket.on("join_lobby_room", (joinCode) => {
    socket.join(joinCode);
    console.log(`Socket ${socket.id} joined room ${joinCode}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const parseCookies = (cookieString) => {
  if (!cookieString) return {};
  return Object.fromEntries(
    cookieString.split("; ").map((c) => {
      const [key, ...v] = c.split("=");
      return [key, decodeURIComponent(v.join("="))];
    }),
  );
};

const hocuspocusServer = new Hocuspocus({
  async onAuthenticate(data) {
    const { request, documentName } = data;
    const joinCode = documentName.replace("group-", "");

    const rawCookieString =
      typeof request.headers.get === "function"
        ? request.headers.get("cookie")
        : request.headers.cookie;

    const cookies = parseCookies(rawCookieString);
    const token = cookies.alab_token;

    if (!token) {
      throw new Error("Access Denied. Please log in.");
    }

    let verifiedUser;
    try {
      verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid or expired token.");
    }

    const group = await LabGroup.findOne({ where: { joinCode } });
    if (!group) {
      throw new Error("Group not found");
    }

    const role = verifiedUser.role.toLowerCase();
    const isAdminOrFaculty = ["admin", "technician", "faculty"].includes(role);

    if (!isAdminOrFaculty) {
      const membership = await GroupMember.findOne({
        where: {
          groupId: group.id,
          userId: verifiedUser.id,
        },
      });

      if (!membership) {
        throw new Error(
          "Access Denied. You are not a member of this workspace.",
        );
      }
    }

    return {
      user: verifiedUser,
      groupId: group.id,
    };
  },

  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        try {
          const joinCode = documentName.replace("group-", "");

          const group = await LabGroup.findOne({ where: { joinCode } });
          if (!group) return null;

          const doc = await Document.findOne({
            where: { groupId: group.id },
          });

          if (!doc || !doc.data) return null;

          let binaryData;
          if (Buffer.isBuffer(doc.data)) {
            binaryData = doc.data;
          } else if (
            doc.data.type === "Buffer" &&
            Array.isArray(doc.data.data)
          ) {
            binaryData = Buffer.from(doc.data.data);
          } else {
            binaryData = Buffer.from(doc.data);
          }

          return new Uint8Array(binaryData);
        } catch (err) {
          console.error("Hocuspocus FETCH error:", err);
          return null;
        }
      },
      store: async ({ documentName, state }) => {
        try {
          const joinCode = documentName.replace("group-", "");

          const group = await LabGroup.findOne({ where: { joinCode } });
          if (!group) return;

          await Document.upsert({
            groupId: group.id,
            data: state,
          });

          console.log(`Saved Workspace state for Group PIN: ${joinCode}`);
        } catch (err) {
          console.error("Hocuspocus STORE error:", err);
        }
      },
    }),
  ],
});

const ws = (crossws.default || crossws)({
  hooks: {
    open(peer) {
      const clientConnection = hocuspocusServer.handleConnection(
        peer.websocket,
        peer.request,
        {},
      );
      peer._hocuspocus = clientConnection;
    },
    message(peer, message) {
      if (peer._hocuspocus) {
        peer._hocuspocus.handleMessage(message.uint8Array());
      }
    },
    close(peer, event) {
      if (peer._hocuspocus) {
        peer._hocuspocus.handleClose({
          code: event.code,
          reason: event.reason,
        });
      }
    },
    error(peer, error) {
      console.error("WebSocket error for peer:", peer.id, error);
    },
  },
});

server.on("upgrade", (request, socket, head) => {
  if (request.url.startsWith("/collaboration")) {
    ws.handleUpgrade(request, socket, head);
  }
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
const aiRoutes = require("./routes/ai");
app.use("/api/ai", aiRoutes);
const userProfileRoutes = require("./routes/userProfile");
app.use("/api/user", userProfileRoutes);
const workspaceRoutes = require("./routes/workspace");
app.use("/api/workspace", workspaceRoutes);
const statsRoutes = require("./routes/stats");
app.use("/api/stats", statsRoutes);
const matchmakingRoutes = require("./routes/matchmaking");
app.use("/api/matchmaking", matchmakingRoutes);
const classManagementRoutes = require("./routes/classManagement");
app.use("/api/class-management", classManagementRoutes);
const sectionManagementRoutes = require("./routes/sectionManagement");
app.use("/api/section-management", sectionManagementRoutes);

const PORT = process.env.PORT || 5000;

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database synced successfully.");
    server.listen(PORT, "0.0.0.0", () => {
      console.log(
        `ALAB Backend (HTTP, Socket.IO & Hocuspocus) listening on port ${PORT}`,
      );
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
  });
