"use client";

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import CreateSessionModal from "@/components/CreateSessionModal";
import "../dashboard.css";
import router from "next/router";
import { useRouter } from "next/navigation";

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lastSession, setLastSession] = useState<Session | null>(null);

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="navbar-logo">MentorSpace 🚀</div>
        <div className="navbar-user">
          <span className="navbar-role-badge">mentor</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <h2>Welcome, {user?.firstName}! 👋</h2>
          <p>Ready to start a mentorship session?</p>
        </div>

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
              <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                Active session: {lastSession.title}
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-text-muted)",
                }}
              >
                Join code:{" "}
                <strong style={{ letterSpacing: "3px" }}>
                  {lastSession.join_code}
                </strong>
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
          <div className="dashboard-card">
            <div className="card-icon">🎯</div>
            <div className="card-title">Create New Session</div>
            <div className="card-desc">
              Start a new 1-on-1 mentorship session. Share the join code with
              your student.
            </div>
            <button
              className="card-btn"
              onClick={() => setShowCreateModal(true)}
            >
              Create Session
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📋</div>
            <div className="card-title">My Sessions</div>
            <div className="card-desc">
              View all your past and active mentorship sessions and their
              details.
            </div>
            <button className="card-btn-outline">View Sessions</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">💻</div>
            <div className="card-title">Code Editor</div>
            <div className="card-desc">
              Real-time collaborative code editor with cursor sync and video
              call.
            </div>
            <button className="card-btn-outline">Open Editor</button>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(session) => {
            setLastSession(session);
          }}
        />
      )}
    </div>
  );
}
