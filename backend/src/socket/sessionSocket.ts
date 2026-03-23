import { Server, Socket } from "socket.io";
import { supabase } from "../config/supabase";

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

        console.log(`👤 ${userName} (${role}) joined room: ${sessionId}`);

        // Notify others
        socket.to(sessionId).emit("user:joined", { userId, userName, role });

        // System message to others only
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

        // Send chat history to the joiner only
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

    socket.on(
      "code:change",
      async ({ sessionId, code, language }: CodeChangeData) => {
        // Broadcast to others immediately
        socket.to(sessionId).emit("code:update", { code, language });

        // Save snapshot max once every 5 seconds per session
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

    // ── LEAVE ──────────────────────────────────────────────
    socket.on(
      "room:leave",
      ({ sessionId, userName }: { sessionId: string; userName: string }) => {
        socket.to(sessionId).emit("chat:receive", {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderName: "System",
          content: `${userName} left the session`,
          type: "system",
          createdAt: new Date().toISOString(),
        });
        socket.leave(sessionId);
      },
    );

    // ── DISCONNECT ─────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};
