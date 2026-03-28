import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import "./home.css";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="home-container">
      <nav className="home-nav">
        <div className="home-nav-logo">MentorSpace 🚀</div>
        <div className="home-nav-links">
          <Link href="/sign-in">
            <button className="home-btn-outline">Login</button>
          </Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-badge">✨ Real-time Mentorship Platform</div>
        <h1 className="home-title">
          Learn Better,
          <br />
          <span className="home-title-accent">Together</span>
        </h1>
        <p className="home-subtitle">
          1-on-1 mentorship sessions with live code editor, video call, and
          real-time chat. All in one place.
        </p>
        <div className="home-cta">
          <Link href="/sign-up">
            <button className="home-btn-primary home-btn-large">
              Get Started for Free →
            </button>
          </Link>
        </div>
      </section>

      <section className="home-features">
        <div className="home-feature-card">
          <div className="home-feature-icon">💻</div>
          <div className="home-feature-title">Live Code Editor</div>
          <div className="home-feature-desc">
            Real-time collaborative Monaco editor with cursor sync, syntax
            highlighting and language selection.
          </div>
        </div>
        <div className="home-feature-card">
          <div className="home-feature-icon">📹</div>
          <div className="home-feature-title">Video Call</div>
          <div className="home-feature-desc">
            1-on-1 WebRTC video call with mic and camera controls built right
            into the session.
          </div>
        </div>
        <div className="home-feature-card">
          <div className="home-feature-icon">💬</div>
          <div className="home-feature-title">Session Chat</div>
          <div className="home-feature-desc">
            Real-time chat with timestamps. Messages are session-based and
            cleared after each session ends.
          </div>
        </div>
      </section>

      <footer className="home-footer">
        Built with Next.js, Socket.io, WebRTC & Supabase
      </footer>
    </main>
  );
}
