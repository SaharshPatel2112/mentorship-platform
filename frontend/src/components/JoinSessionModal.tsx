"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiToken } from "@/lib/getToken";
import "./modals.css";

interface Props {
  onClose: () => void;
}

export default function JoinSessionModal({ onClose }: Props) {
  const { authFetch } = useApiToken();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!joinCode.trim() || joinCode.length < 6) {
      setError("Please enter a valid join code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = (await authFetch(`/sessions/join/${joinCode}`, {
        method: "POST",
      })) as { session: { id: string } };

      router.push(`/session/${data.session.id}`);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🔗 Join Session</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-form-group">
            <label>Enter Join Code</label>
            <input
              className="join-code-input"
              type="text"
              placeholder="XXXXXXXX"
              value={joinCode}
              maxLength={8}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
          </div>

          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-muted)",
              textAlign: "center",
            }}
          >
            Ask your mentor for the 8-character join code
          </p>

          <button
            className="modal-submit-btn"
            onClick={handleJoin}
            disabled={loading || joinCode.length < 8}
          >
            {loading ? "Joining..." : "Join Session →"}
          </button>
        </div>
      </div>
    </div>
  );
}
