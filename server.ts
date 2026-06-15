import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);

  // Initialize Socket.io signaling server
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Simple room and peer connection tracking
  io.on("connection", (socket) => {
    socket.on("join-room", (roomCode: string) => {
      if (!roomCode || typeof roomCode !== "string") {
        socket.emit("error-msg", "Invalid room code");
        return;
      }

      const clientRoom = io.sockets.adapter.rooms.get(roomCode);
      const numClients = clientRoom ? clientRoom.size : 0;

      if (numClients >= 2) {
        socket.emit("room-full", roomCode);
        return;
      }

      socket.join(roomCode);
      (socket as any).roomCode = roomCode;

      const clients = io.sockets.adapter.rooms.get(roomCode);
      const updatedCount = clients ? clients.size : 0;

      if (updatedCount === 1) {
        socket.emit("room-joined", { role: "initiator", roomCode });
      } else if (updatedCount === 2) {
        socket.emit("room-joined", { role: "receiver", roomCode });
        // Let the initiator know we have a potential peer so they can start the WebRTC process
        io.to(roomCode).emit("room-ready", roomCode);
      }
    });

    // Handle incoming WebRTC signaling messages (offers, answers, and candidates)
    socket.on("signal", (data: { roomCode: string; signal: any }) => {
      if (data && data.roomCode) {
        // Broadcast signaling messages to the other client in the room
        socket.to(data.roomCode).emit("signal", data.signal);
      }
    });

    // Client leaving room explicitly
    socket.on("leave-room", (roomCode: string) => {
      if (roomCode) {
        socket.leave(roomCode);
        socket.to(roomCode).emit("peer-left");
      }
    });

    // Cleanup on disconnect
    socket.on("disconnect", () => {
      const roomCode = (socket as any).roomCode;
      if (roomCode) {
        io.to(roomCode).emit("peer-left");
      }
    });
  });

  // Serve static application files or handle Vite DevServer proxying
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical error while boot-strapping Express and Socket.io server:", error);
});
