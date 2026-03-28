"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import CreateSessionModal from "@/components/CreateSessionModal";
import MentorSessionsList from "@/components/MentorSessionsList";
import "../dashboard.css";

interface ActiveSession {
  id: string;
  title: string;
  join_code: string;
  language: string;
  status: string;
}

export default function MentorDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [showCreateModal, setShowCreate] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null,
  );
  const [hasEntered, setHasEntered] = useState(false);

  // Load active session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mentorActiveSession");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveSession(parsed.session);
        setHasEntered(parsed.hasEntered || false);
      } catch {
        localStorage.removeItem("mentorActiveSession");
      }
    }
  }, []);

  // Save to localStorage whenever activeSession changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem(
        "mentorActiveSession",
        JSON.stringify({
          session: activeSession,
          hasEntered,
        }),
      );
    } else {
      localStorage.removeItem("mentorActiveSession");
    }
  }, [activeSession, hasEntered]);

  const handleSessionCreated = (session: ActiveSession) => {
    setActiveSession(session);
    setHasEntered(false);
    setShowCreate(false);
  };

  const handleEnterSession = () => {
    if (!activeSession) return;
    setHasEntered(true);
    router.push(`/session/${activeSession.id}`);
  };

  const handleEndSessionBanner = () => {
    setActiveSession(null);
    setHasEntered(false);
    localStorage.removeItem("mentorActiveSession");
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="navbar-logo">MentorSpace 🚀</div>
        <div className="navbar-user">
          <span className="navbar-role-badge">mentor</span>
          <UserButton />
        </div>
      </nav>

      <div className="dashboard-content">
        {!showSchedule ? (
          <>
            <div className="dashboard-welcome">
              <h2>Welcome, {user?.firstName}! 👋</h2>
              <p>Create a session or manage your schedule.</p>
            </div>

            {/* ── Active Session Banner ── */}
            {activeSession && (
              <div
                style={{
                  background: "#eef2ff",
                  border: "1.5px solid #c7d2fe",
                  borderRadius: "var(--radius-md)",
                  padding: "18px 20px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--color-text)",
                        marginBottom: "6px",
                        fontSize: "0.95rem",
                      }}
                    >
                      {hasEntered ? "🔄 Active Session" : "✅ Session Created"}{" "}
                      — {activeSession.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Join code:{" "}
                      <strong
                        style={{
                          letterSpacing: "3px",
                          fontFamily: "monospace",
                          color: "var(--color-primary)",
                          fontSize: "0.9rem",
                        }}
                      >
                        {activeSession.join_code}
                      </strong>
                      {!hasEntered && (
                        <span
                          style={{ marginLeft: "8px", fontSize: "0.75rem" }}
                        >
                          — Copy and add to your schedule
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                  >
                    {/* Enter / Rejoin button */}
                    <button
                      className="card-btn"
                      style={{ width: "auto", padding: "9px 20px" }}
                      onClick={handleEnterSession}
                    >
                      {hasEntered ? "🔄 Rejoin Session" : "▶️ Enter Session →"}
                    </button>

                    {/* End session (remove banner) */}
                    <button
                      onClick={handleEndSessionBanner}
                      style={{
                        padding: "9px 16px",
                        background: "transparent",
                        border: "1.5px solid #fca5a5",
                        color: "#ef4444",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✕ End Session
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Dashboard Cards ── */}
            <div className="dashboard-cards">
              <div className="dashboard-card">
                <div className="card-icon">🎯</div>
                <div className="card-title">Create Session</div>
                <div className="card-desc">
                  Start a live session now. You will get a join code — share it
                  with your student or add it to the schedule.
                </div>
                <button
                  className="card-btn"
                  onClick={() => setShowCreate(true)}
                >
                  Create Session
                </button>
              </div>

              <div className="dashboard-card">
                <div className="card-icon">📅</div>
                <div className="card-title">Class Schedule</div>
                <div className="card-desc">
                  Plan upcoming sessions. Add date, time, topic and join code so
                  your student knows when to join.
                </div>
                <button
                  className="card-btn-outline"
                  onClick={() => setShowSchedule(true)}
                >
                  Manage Schedule
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowSchedule(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                marginBottom: "20px",
                padding: 0,
              }}
            >
              ← Back to Dashboard
            </button>
            <MentorSessionsList />
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={handleSessionCreated}
        />
      )}
    </div>
  );
}
