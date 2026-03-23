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

  // Drag refs
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

  // ── Step 1: Fetch session data ────────────────────────────
  // Runs as soon as user is loaded — no socket dependency
  useEffect(() => {
    if (!isLoaded || !user || !sessionId) return;

    const initSession = async () => {
      console.log("initSession started:", sessionId);
      try {
        // Fetch session
        const data = await authFetch(`/sessions/find-by-id/${sessionId}`);
        console.log("session fetched:", data);

        if (!data?.session) {
          console.error("No session found");
          router.push("/dashboard");
          return;
        }

        setSession(data.session);

        const userRole = (user.unsafeMetadata?.role as string) || "student";
        setRole(userRole === "mentor" ? "mentor" : "student");

        // Fetch snapshot
        try {
          const snapData = await authFetch(`/sessions/snapshot/${sessionId}`);
          console.log("snapshot fetched:", snapData);
          if (snapData?.snapshot) {
            setInitialCode(snapData.snapshot.code);
            setInitialLanguage(snapData.snapshot.language);
          } else {
            setInitialLanguage(data.session.language || "javascript");
          }
        } catch {
          // No snapshot yet — use session default language
          setInitialLanguage(data.session.language || "javascript");
        }

        console.log("loading done");
        // ← This was missing before — setLoading(false) must be called
        setLoading(false);
      } catch (err: unknown) {
        console.error(
          "initSession error:",
          err instanceof Error ? err.message : err,
        );
        setLoading(false);
        router.push("/dashboard");
      }
    };

    initSession();
  }, [isLoaded, user, sessionId]);

  // ── Step 2: Join socket room after loading is done ────────
  // Separate effect — only runs when loading=false AND socket ready
  useEffect(() => {
    if (loading || !user || !sessionId || !socket) return;
    if (hasJoinedRef.current) return;

    hasJoinedRef.current = true;

    const userRole = (user.unsafeMetadata?.role as string) || "student";

    console.log("joining socket room:", sessionId);
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
      console.error("End session error:", err);
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
            <button className="end-session-btn" onClick={handleEndSession}>
              End Session
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
              Leave Session
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
            <VideoPanel sessionId={sessionId} />
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
