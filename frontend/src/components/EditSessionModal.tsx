"use client";

import { useState } from "react";
import { useApiToken } from "@/lib/getToken";
import "./modals.css";
import "../app/dashboard/sessions.css";

interface Session {
  id: string;
  title: string;
  language: string;
  join_code: string;
  status: string;
  scheduled_at?: string;
  description?: string;
  assigned_student_email?: string;
}

interface Props {
  session: Session;
  onClose: () => void;
  onUpdated: (session: Session) => void;
}

const LANGUAGES = ["javascript", "typescript", "python", "java", "cpp"];

export default function EditSessionModal({
  session,
  onClose,
  onUpdated,
}: Props) {
  const { authFetch } = useApiToken();

  const [title, setTitle] = useState(session.title);
  const [language, setLanguage] = useState(session.language);
  const [scheduledAt, setScheduledAt] = useState(
    session.scheduled_at
      ? new Date(session.scheduled_at).toISOString().slice(0, 16)
      : "",
  );
  const [description, setDescription] = useState(session.description || "");
  const [studentEmail, setStudentEmail] = useState(
    session.assigned_student_email || "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = (await authFetch(`/sessions/update/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          language,
          scheduled_at: scheduledAt || null,
          description,
          assigned_student_email: studentEmail,
        }),
      })) as { session: Session };

      onUpdated(data.session);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "540px" }}
      >
        <div className="modal-header">
          <div className="modal-title">✏️ Edit Session</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && (
          <div className="modal-error" style={{ marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* Join Code Display */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Student Join Code
          </div>
          <div className="join-code-box">
            <span className="join-code-text">{session.join_code}</span>
            <button className="copy-code-btn" onClick={handleCopyCode}>
              {copied ? "✅" : "📋"}
            </button>
            <span
              style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}
            >
              {copied ? "Copied!" : "Copy for student"}
            </span>
          </div>
        </div>

        <div className="edit-modal-grid">
          {/* Title */}
          <div className="modal-form-group edit-modal-full">
            <label>Session Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. React Hooks Deep Dive"
            />
          </div>

          {/* Language */}
          <div className="modal-form-group">
            <label>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled Date/Time */}
          <div className="modal-form-group">
            <label>Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          {/* Student Email */}
          <div className="modal-form-group edit-modal-full">
            <label>Assign Student (Email)</label>
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@example.com"
            />
          </div>

          {/* Description */}
          <div className="modal-form-group edit-modal-full">
            <label>Topic / Description</label>
            <textarea
              className="modal-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you cover in this session?"
            />
          </div>
        </div>

        <button
          className="modal-submit-btn"
          style={{ marginTop: "20px" }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes ✓"}
        </button>
      </div>
    </div>
  );
}
