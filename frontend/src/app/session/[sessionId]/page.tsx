"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useSocket } from "@/hooks/useSocket";
import CodeEditor from "@/components/CodeEditor";
import ChatPanel from "@/components/ChatPanel";
import VideoPanel from "@/components/VideoPanel";
import { useApiToken } from "@/lib/getToken";
import "./session.css";

interface Session {
  id: string;
  title: string;
  join_code: string;
  language: string;
  status: string;
  mentor_id: string;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const socket = useSocket();
  const { authFetch } = useApiToken();
  const sessionId = params.sessionId as string;

  const [initialCode, setInitialCode] = useState("// Start coding here...\n");
  const [initialLanguage, setInitialLanguage] = useState("javascript");
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"mentor" | "student">("student");
  const [loading, setLoading] = useState(true);

  // Panel sizes
  const [rightWidth, setRightWidth] = useState(340);
  const [videoHeight, setVideoHeight] = useState(220);

  // Refs
  const isDraggingH = useRef(false);
  const isDraggingV = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startW = useRef(0);
  const startH = useRef(0);
  const hasJoinedRef = useRef(false);

  // ── Resize handlers ───────────────────────────────────────
  const onMouseDownH = useCallback(
    (e: React.MouseEvent) => {
      isDraggingH.current = true;
      startX.current = e.clientX;
      startW.current = rightWidth;
      e.preventDefault();
    },
    [rightWidth],
  );

  const onMouseDownV = useCallback(
    (e: React.MouseEvent) => {
      isDraggingV.current = true;
      startY.current = e.clientY;
      startH.current = videoHeight;
      e.preventDefault();
    },
    [videoHeight],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingH.current) {
        const delta = startX.current - e.clientX;
        const newWidth = Math.min(600, Math.max(240, startW.current + delta));
        setRightWidth(newWidth);
      }
      if (isDraggingV.current) {
        const delta = e.clientY - startY.current;
        const newHeight = Math.min(400, Math.max(120, startH.current + delta));
        setVideoHeight(newHeight);
      }
    };
    const onMouseUp = () => {
      isDraggingH.current = false;
      isDraggingV.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Step 1: Fetch session data ─────────────────────────────
  useEffect(() => {
    if (!isLoaded || !user || !sessionId) return;

    const initSession = async () => {
      try {
        const data = await authFetch(`/sessions/find-by-id/${sessionId}`);

        // null means Clerk token was cancelled — stop quietly
        if (!data) {
          setLoading(false);
          return;
        }

        // Type safe access
        const sessionData = (data as { session?: Session }).session;

        if (!sessionData) {
          setLoading(false);
          router.push("/dashboard");
          return;
        }

        setSession(sessionData);

        const userRole = (user.unsafeMetadata?.role as string) || "student";
        setRole(userRole === "mentor" ? "mentor" : "student");

        // Fetch snapshot separately — failure is OK
        try {
          const snapData = await authFetch(`/sessions/snapshot/${sessionId}`);
          const snap = (
            snapData as { snapshot?: { code: string; language: string } } | null
          )?.snapshot;
          if (snap) {
            setInitialCode(snap.code);
            setInitialLanguage(snap.language);
          } else {
            setInitialLanguage(sessionData.language || "javascript");
          }
        } catch {
          setInitialLanguage(sessionData.language || "javascript");
        }

        setLoading(false);
      } catch (err: unknown) {
        // Always convert to string — never bubble up an object
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Failed to load session";
        console.error("initSession error:", message);
        setLoading(false);
      }
    };

    // Wrap in extra .catch() — final safety net for unhandled rejections
    initSession().catch((err) => {
      console.error("Unhandled error:", String(err));
      setLoading(false);
    });
  }, [isLoaded, user, sessionId]);

  // ── Step 2: Join socket room after data loads ──────────────
  useEffect(() => {
    if (loading || !user || !sessionId || !socket) return;
    if (hasJoinedRef.current) return;

    hasJoinedRef.current = true;

    const userRole = (user.unsafeMetadata?.role as string) || "student";

    socket.emit("room:join", {
      sessionId,
      userId: user.id,
      userName: user.firstName || user.fullName || "User",
      role: userRole,
    });

    const handleBeforeUnload = () => {
      socket.emit("room:leave", {
        sessionId,
        userName: user.firstName || "User",
      });
    };
    // Listen for other user leaving — show notification but don't redirect
    socket.on(
      "user:left",
      ({
        userName,
        canRejoin,
      }: {
        userName: string;
        role: string;
        canRejoin: boolean;
      }) => {
        if (canRejoin) {
          // Show temporary notification
          const toast = document.createElement("div");
          toast.innerText = `${userName} left — they can rejoin`;
          toast.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: #1e293b;
      color: #94a3b8;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.85rem;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
      border: 1px solid #334155;
    `;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);
        }
      },
    );

    return () => {
      socket.off("user:left");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [loading, user, sessionId, socket]);

  // ── End session ───────────────────────────────────────────
  const handleEndSession = async () => {
    if (!session) return;
    try {
      await authFetch(`/sessions/end/${session.id}`, { method: "PATCH" });
      router.push("/dashboard");
    } catch (err) {
      console.error("End session error:", String(err));
    }
  };

  // ── Loading screen ────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#1e1e1e",
          color: "#888",
          fontSize: "1rem",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div>Loading session...</div>
        <div style={{ fontSize: "0.75rem", color: "#555" }}>{sessionId}</div>
      </div>
    );
  }

  return (
    <div className="session-container">
      {/* Navbar */}
      <nav className="session-navbar">
        <div className="session-navbar-left">
          <span className="session-logo">MentorSpace 🚀</span>
          <span className="session-title">{session?.title}</span>
          <span className="session-code-badge">{session?.join_code}</span>
        </div>
        <div className="session-navbar-right">
          <span className={`session-role-badge ${role}`}>{role}</span>
          {role === "mentor" ? (
            <button
              className="end-session-btn"
              onClick={() => {
                if (socket) {
                  socket.emit("room:leave", {
                    sessionId,
                    userName: user?.firstName || "Mentor",
                  });
                }
                router.push("/dashboard");
              }}
            >
              🚪 Leave Session
            </button>
          ) : (
            <button
              className="end-session-btn"
              onClick={() => {
                if (socket) {
                  socket.emit("room:leave", {
                    sessionId,
                    userName: user?.firstName || "Student",
                  });
                }
                router.push("/dashboard");
              }}
            >
              🚪 Leave Session
            </button>
          )}
        </div>
      </nav>

      {/* Body */}
      <div className="session-body">
        {/* Editor */}
        <div className="editor-panel" style={{ flex: 1, minWidth: 0 }}>
          <CodeEditor
            sessionId={sessionId}
            socket={socket}
            role={role}
            initialCode={initialCode}
            initialLanguage={initialLanguage}
          />
        </div>

        {/* Horizontal divider */}
        <div className="resize-divider-h" onMouseDown={onMouseDownH} />

        {/* Right panel */}
        <div
          className="right-panel"
          style={{ width: rightWidth, minWidth: 240, maxWidth: 600 }}
        >
          {/* Video */}
          <div
            style={{ height: videoHeight, flexShrink: 0, overflow: "hidden" }}
          >
            <VideoPanel sessionId={sessionId} socket={socket} role={role} />
          </div>

          {/* Vertical divider */}
          <div className="resize-divider-v" onMouseDown={onMouseDownV} />

          {/* Chat */}
          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            <ChatPanel
              sessionId={sessionId}
              socket={socket}
              currentUserId={user?.id || ""}
              currentUserName={user?.firstName || user?.fullName || "User"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
