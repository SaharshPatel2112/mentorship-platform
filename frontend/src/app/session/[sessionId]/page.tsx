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
import OutputPanel from "@/components/OutputPanel";

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
  const [currentCode, setCurrentCode] = useState("// Start coding here...\n");
  const [currentLanguage, setCurrentLanguage] = useState("javascript");

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
  const [outputHeight, setOutputHeight] = useState(200);
  const isDraggingOutput = useRef(false);
  const startYOutput = useRef(0);
  const startHOutput = useRef(0);

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

  const onMouseDownOutput = useCallback(
    (e: React.MouseEvent) => {
      isDraggingOutput.current = true;
      startYOutput.current = e.clientY;
      startHOutput.current = outputHeight;
      e.preventDefault();
    },
    [outputHeight],
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
        const newHeight = Math.min(400, Math.max(220, startH.current + delta));
        setVideoHeight(newHeight);
      }
      if (isDraggingOutput.current) {
        const delta = startYOutput.current - e.clientY;
        const newHeight = Math.min(
          500,
          Math.max(80, startHOutput.current + delta),
        );
        setOutputHeight(newHeight);
      }
    };
    const onMouseUp = () => {
      isDraggingH.current = false;
      isDraggingV.current = false;
      isDraggingOutput.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Fetch session data ─────────────────────────────
  useEffect(() => {
    if (!isLoaded || !user || !sessionId) return;

    const initSession = async () => {
      try {
        const data = await authFetch(`/sessions/find-by-id/${sessionId}`);

        if (!data) {
          setLoading(false);
          return;
        }

        const sessionData = (data as { session?: Session }).session;

        if (!sessionData) {
          setLoading(false);
          router.push("/dashboard");
          return;
        }

        setSession(sessionData);

        const userRole = (user.unsafeMetadata?.role as string) || "student";
        setRole(userRole === "mentor" ? "mentor" : "student");

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

    initSession().catch((err) => {
      console.error("Unhandled error:", String(err));
      setLoading(false);
    });
  }, [isLoaded, user, sessionId]);

  // ── Join socket room after data loads ──────────────
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
          <div className="editor-output-wrapper">
            {/* Editor takes remaining height */}
            <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
              <CodeEditor
                sessionId={sessionId}
                socket={socket}
                role={role}
                initialCode={initialCode}
                initialLanguage={initialLanguage}
                onCodeChange={(code) => setCurrentCode(code)}
                onLanguageChange={(lang) => setCurrentLanguage(lang)}
              />
            </div>

            {/* Draggable divider between editor and output */}
            <div
              className="resize-divider-output"
              onMouseDown={onMouseDownOutput}
              style={{
                height: "6px",
                background: "#2d2d2d",
                cursor: "row-resize",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#6366f1")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#2d2d2d")
              }
            />

            {/* Output panel with controlled height */}
            <div
              style={{
                height: outputHeight,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <OutputPanel
                code={currentCode}
                language={currentLanguage || initialLanguage}
                socket={socket}
                sessionId={sessionId}
                height={outputHeight}
              />
            </div>
          </div>
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
