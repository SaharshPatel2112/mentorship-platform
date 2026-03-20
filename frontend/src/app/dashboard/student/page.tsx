"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import "../dashboard.css";

export default function StudentDashboard() {
  const { user } = useUser();

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="navbar-logo">MentorSpace 🚀</div>
        <div className="navbar-user">
          <span className="navbar-role-badge">student</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <h2>Welcome, {user?.firstName}! 👋</h2>
          <p>Ready to learn something new today?</p>
        </div>

        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="card-icon">🔗</div>
            <div className="card-title">Join Session</div>
            <div className="card-desc">
              Have a session link from your mentor? Enter the code to join.
            </div>
            <button className="card-btn">Join Session</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📚</div>
            <div className="card-title">My Sessions</div>
            <div className="card-desc">
              View all your past mentorship sessions and code snapshots.
            </div>
            <button className="card-btn-outline">View Sessions</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">🎥</div>
            <div className="card-title">Video + Chat</div>
            <div className="card-desc">
              1-on-1 video call with mic/camera controls and real-time chat.
            </div>
            <button className="card-btn-outline">Learn More</button>
          </div>
        </div>
      </div>
    </div>
  );
}
