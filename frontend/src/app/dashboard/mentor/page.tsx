"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import "../dashboard.css";

export default function MentorDashboard() {
  const { user } = useUser();

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

        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="card-icon">🎯</div>
            <div className="card-title">Create New Session</div>
            <div className="card-desc">
              Start a new 1-on-1 mentorship session. Share the link with your
              student.
            </div>
            <button className="card-btn">Create Session</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📋</div>
            <div className="card-title">My Sessions</div>
            <div className="card-desc">
              View all your past and active mentorship sessions.
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
    </div>
  );
}
