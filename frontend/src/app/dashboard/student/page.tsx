"use client";

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import JoinSessionModal from "@/components/JoinSessionModal";
import StudentSessionsList from "@/components/StudentSessionsList";
import "../dashboard.css";

export default function StudentDashboard() {
  const { user } = useUser();
  const [showJoinModal, setShowJoin] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="navbar-logo">MentorSpace 🚀</div>
        <div className="navbar-user">
          <span className="navbar-role-badge">student</span>
          <UserButton />
        </div>
      </nav>

      <div className="dashboard-content">
        {!showSchedule ? (
          <>
            <div className="dashboard-welcome">
              <h2>Welcome, {user?.firstName}! 👋</h2>
              <p>Ready to learn something new today?</p>
            </div>

            <div className="dashboard-cards">
              {/* Join Session */}
              <div className="dashboard-card">
                <div className="card-icon">🔗</div>
                <div className="card-title">Join Session</div>
                <div className="card-desc">
                  Have a join code from your mentor? Enter it to jump straight
                  into the live session.
                </div>
                <button className="card-btn" onClick={() => setShowJoin(true)}>
                  Join Session
                </button>
              </div>

              {/* My Schedule */}
              <div className="dashboard-card">
                <div className="card-icon">📅</div>
                <div className="card-title">My Schedule</div>
                <div className="card-desc">
                  View upcoming sessions your mentor has scheduled for you with
                  date, time and join code.
                </div>
                <button
                  className="card-btn-outline"
                  onClick={() => setShowSchedule(true)}
                >
                  View Schedule
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
            <StudentSessionsList />
          </>
        )}
      </div>

      {showJoinModal && <JoinSessionModal onClose={() => setShowJoin(false)} />}
    </div>
  );
}
