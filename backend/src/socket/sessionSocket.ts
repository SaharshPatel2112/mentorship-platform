import { Server, Socket } from "socket.io";
import { supabase } from "../config/supabase";

// Track users in each room
const roomUsers: Record<string, Set<string>> = {};

interface JoinRoomData {
  sessionId: string;
  userId: string;
  userName: string;
  role: "mentor" | "student";
}

interface CodeChangeData {
  sessionId: string;
  code: string;
  language: string;
}

interface CursorChangeData {
  sessionId: string;
  userId: string;
  userName: string;
  role: string;
  position: { lineNumber: number; column: number };
}

interface SelectionChangeData {
  sessionId: string;
  userId: string;
  userName: string;
  role: string;
  selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null;
}

interface ChatMessageData {
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "system" | "code";
}

interface VideoOfferData {
  sessionId: string;
  offer: object;
}

interface VideoAnswerData {
  sessionId: string;
  answer: object;
}

interface IceCandidateData {
  sessionId: string;
  candidate: object;
}

// Track last snapshot save time to avoid too many DB writes
const lastSnapshotTime: Record<string, number> = {};

export const setupSessionSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── JOIN ROOM ──────────────────────────────────────────
    socket.on(
      "room:join",
      async ({ sessionId, userId, userName, role }: JoinRoomData) => {
        socket.join(sessionId);
        socket.data = { sessionId, userId, userName, role };
        if (!roomUsers[sessionId]) roomUsers[sessionId] = new Set();
        roomUsers[sessionId].add(userId);

        console.log(
          `👤 ${userName} (${role}) joined room: ${sessionId} — users: ${roomUsers[sessionId].size}`,
        );

        console.log(`👤 ${userName} (${role}) joined room: ${sessionId}`);

        socket.to(sessionId).emit("user:joined", { userId, userName, role });

        // System message to others only — not saved to DB
        socket.to(sessionId).emit("chat:receive", {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderName: "System",
          content: `${userName} joined the session`,
          type: "system",
          createdAt: new Date().toISOString(),
        });

        // Send last code snapshot to the joiner
        const { data: snapshot } = await supabase
          .from("code_snapshots")
          .select("*")
          .eq("session_id", sessionId)
          .order("saved_at", { ascending: false })
          .limit(1)
          .single();

        if (snapshot) {
          socket.emit("code:init", {
            code: snapshot.code,
            language: snapshot.language,
          });
        }

        // Send chat history to joiner only
        const { data: messages } = await supabase
          .from("messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (messages && messages.length > 0) {
          socket.emit(
            "chat:history",
            messages.map((m) => ({
              id: m.id,
              senderId: m.sender_id ?? "system",
              senderName:
                m.sender_name && m.sender_name !== "User"
                  ? m.sender_name
                  : m.type === "system"
                    ? "System"
                    : "User",
              content: m.content,
              type: m.type ?? "text",
              createdAt: m.created_at ?? new Date().toISOString(),
            })),
          );
        }
      },
    );

    // ── CODE SYNC ──────────────────────────────────────────
    socket.on(
      "code:change",
      async ({ sessionId, code, language }: CodeChangeData) => {
        socket.to(sessionId).emit("code:update", { code, language });

        const now = Date.now();
        if (
          !lastSnapshotTime[sessionId] ||
          now - lastSnapshotTime[sessionId] > 5000
        ) {
          lastSnapshotTime[sessionId] = now;
          await supabase.from("code_snapshots").insert({
            session_id: sessionId,
            code,
            language,
          });
        }
      },
    );

    // ── CURSOR SYNC (both ways) ────────────────────────────
    socket.on(
      "cursor:change",
      ({ sessionId, userId, userName, role, position }: CursorChangeData) => {
        socket.to(sessionId).emit("cursor:update", {
          userId,
          userName,
          role,
          position,
        });
      },
    );

    // ── SELECTION SYNC (both ways) ─────────────────────────
    socket.on(
      "selection:change",
      ({
        sessionId,
        userId,
        userName,
        role,
        selection,
      }: SelectionChangeData) => {
        socket.to(sessionId).emit("selection:update", {
          userId,
          userName,
          role,
          selection,
        });
      },
    );

    // ── CHAT ───────────────────────────────────────────────
    socket.on(
      "chat:send",
      async ({
        sessionId,
        senderId,
        senderName,
        content,
        type,
      }: ChatMessageData) => {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            session_id: sessionId,
            sender_id: senderId,
            sender_name: senderName,
            content,
            type: type || "text",
          })
          .select()
          .single();

        if (!error && data) {
          io.to(sessionId).emit("chat:receive", {
            id: data.id,
            senderId,
            senderName,
            content,
            type,
            createdAt: data.created_at,
          });
        }
      },
    );

    // ── WebRTC SIGNALING ───────────────────────────────────

    socket.on("video:offer", ({ sessionId, offer }: VideoOfferData) => {
      console.log(`📹 Video offer from ${socket.data.userName}`);
      socket.to(sessionId).emit("video:offer", { offer });
    });

    socket.on("video:answer", ({ sessionId, answer }: VideoAnswerData) => {
      console.log(`📹 Video answer from ${socket.data.userName}`);
      socket.to(sessionId).emit("video:answer", { answer });
    });

    socket.on("video:ice", ({ sessionId, candidate }: IceCandidateData) => {
      socket.to(sessionId).emit("video:ice", { candidate });
    });

    socket.on("video:ready", ({ sessionId }: { sessionId: string }) => {
      console.log(`📹 Video ready in room: ${sessionId}`);
      socket.to(sessionId).emit("video:ready");
    });

    socket.on(
      "room:leave",
      ({ sessionId, userName }: { sessionId: string; userName: string }) => {
        const userId = socket.data?.userId;
        const role = socket.data?.role;

        if (roomUsers[sessionId] && userId) {
          roomUsers[sessionId].delete(userId);
        }

        socket.to(sessionId).emit("chat:receive", {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderName: "System",
          content: `${userName} left the session`,
          type: "system",
          createdAt: new Date().toISOString(),
        });

        socket.to(sessionId).emit("user:left", {
          userName,
          role,
          canRejoin: true,
        });

        console.log(
          `👋 ${userName} left room ${sessionId} — users remaining: ${roomUsers[sessionId]?.size || 0}`,
        );

        socket.leave(sessionId);
      },
    );

    socket.on(
      "code:output",
      ({
        sessionId,
        result,
      }: {
        sessionId: string;
        result: { stdout: string; stderr: string; code: number };
      }) => {
        io.to(sessionId).emit("code:output", result);
      },
    );

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      const { sessionId, userName, userId, role } = socket.data || {};

      if (sessionId && userId) {
        if (roomUsers[sessionId]) {
          roomUsers[sessionId].delete(userId);
          console.log(
            `❌ ${userName} disconnected — room ${sessionId} users: ${roomUsers[sessionId].size}`,
          );
        }

        if (userName) {
          socket.to(sessionId).emit("chat:receive", {
            id: `sys-${Date.now()}`,
            senderId: "system",
            senderName: "System",
            content: `${userName} disconnected`,
            type: "system",
            createdAt: new Date().toISOString(),
          });

          socket.to(sessionId).emit("user:left", {
            userName,
            role,
            canRejoin: true,
          });
        }
      }
    });
  });
};
