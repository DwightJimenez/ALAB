const express = require("express");
const { sequelize, Document } = require("./models");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const { WebSocketServer } = require("ws");
const { Hocuspocus } = require("@hocuspocus/server");
const { Database } = require("@hocuspocus/extension-database");
const crossws = require("crossws/adapters/node");

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

const hocuspocusServer = new Hocuspocus({
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        try {
          const parsedGroupId = parseInt(
            documentName.replace("group-", ""),
            10,
          );
          if (isNaN(parsedGroupId)) return null;

          const doc = await Document.findOne({
            where: { groupId: parsedGroupId },
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
          const parsedGroupId = parseInt(
            documentName.replace("group-", ""),
            10,
          );
          if (isNaN(parsedGroupId)) return;

          await Document.upsert({
            groupId: parsedGroupId,
            data: state,
          });

          console.log(`Saved Workspace state for Group ID: ${parsedGroupId}`);
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
const statsRoutes = require("./routes/stats")
app.use("/api/stats", statsRoutes)

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
