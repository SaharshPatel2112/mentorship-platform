"use client";

import { useState } from "react";
import { useApiToken } from "@/lib/getToken";
import "./modals.css";
import { useRouter } from "next/navigation";

interface Session {
  id: string;
  title: string;
  join_code: string;
  language: string;
  status: string;
}

interface Props {
  onClose: () => void;
  onCreated: (session: Session) => void;
}

export default function CreateSessionModal({ onClose, onCreated }: Props) {
  const { authFetch } = useApiToken();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Session | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Please enter a session title");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = await authFetch("/sessions/create", {
        method: "POST",
        body: JSON.stringify({ title, language }),
      });
      setCreated(data.session);
      onCreated(data.session);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {created ? "🎉 Session Created!" : "🎯 Create New Session"}
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {!created ? (
          <div className="modal-form">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-form-group">
              <label>Session Title</label>
              <input
                type="text"
                placeholder="e.g. React Hooks Deep Dive"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="modal-form-group">
              <label>Programming Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <button
              className="modal-submit-btn"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Session →"}
            </button>
          </div>
        ) : (
          <div>
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "0.9rem",
                marginBottom: "8px",
              }}
            >
              Share this code with your student to join the session:
            </p>

            <div className="session-code-big">{created.join_code}</div>

            <div className="session-link-box">
              <div className="session-link-label">Session title</div>
              <div className="session-link-value">{created.title}</div>
              <div className="session-link-label">Language</div>
              <div className="session-link-value">{created.language}</div>
            </div>

            <button
              className="copy-btn"
              style={{ marginTop: "16px" }}
              onClick={handleCopy}
            >
              {copied ? "✅ Copied!" : "📋 Copy Join Code"}
            </button>

            <button
              className="modal-submit-btn"
              style={{ marginTop: "10px" }}
              onClick={() => {
                if (created) router.push(`/session/${created.id}`);
              }}
            >
              Start Session →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
