"use client";

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import CreateSessionModal from "@/components/CreateSessionModal";
import MentorSessionsList from "@/components/MentorSessionsList";
import "../dashboard.css";

interface Session {
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
  const [lastSession, setLastSession] = useState<Session | null>(null);

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

            {/* Active session banner */}
            {lastSession && (
              <div
                style={{
                  background: "#eef2ff",
                  border: "1.5px solid #c7d2fe",
                  borderRadius: "var(--radius-md)",
                  padding: "16px 20px",
                  marginBottom: "24px",
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
                      marginBottom: "4px",
                    }}
                  >
                    ✅ Session created — {lastSession.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Join code:{" "}
                    <strong
                      style={{
                        letterSpacing: "3px",
                        fontFamily: "monospace",
                        color: "var(--color-primary)",
                      }}
                    >
                      {lastSession.join_code}
                    </strong>
                    <span style={{ marginLeft: "8px", fontSize: "0.78rem" }}>
                      — Copy this and add to your schedule
                    </span>
                  </div>
                </div>
                <button
                  className="card-btn"
                  style={{ width: "auto", padding: "8px 20px" }}
                  onClick={() => router.push(`/session/${lastSession.id}`)}
                >
                  Enter Session →
                </button>
              </div>
            )}

            <div className="dashboard-cards">
              {/* Create Session */}
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

              {/* My Sessions Schedule */}
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
            {/* Back button */}
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
          onCreated={(session) => {
            setLastSession(session);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
