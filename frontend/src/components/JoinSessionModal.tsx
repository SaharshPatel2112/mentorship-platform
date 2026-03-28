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
    if (!joinCode.trim() || joinCode.length < 8) {
      setError("Please enter a valid 8-character join code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = (await authFetch(`/sessions/join/${joinCode}`, {
        method: "POST",
      })) as { session: { id: string } };

      if (data?.session?.id) {
        router.push(`/session/${data.session.id}`);
      } else {
        setError("Could not join session. Try again.");
      }
    } catch (err: unknown) {
      const e = err as Error;
      const msg = e.message || "Failed to join session";

      if (msg.includes("ended")) {
        setError(
          "This session has ended. Ask your mentor to create a new one.",
        );
      } else if (msg.includes("not found")) {
        setError("Join code not found. Double-check with your mentor.");
      } else {
        setError(msg);
      }
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
            <label>Enter 8-Character Join Code</label>
            <input
              className="join-code-input"
              type="text"
              placeholder="XXXXXXXX"
              value={joinCode}
              maxLength={8}
              onChange={(e) => {
                setError("");
                setJoinCode(e.target.value.toUpperCase());
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && joinCode.length === 8) handleJoin();
              }}
              autoFocus
            />
          </div>

          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--color-text-muted)",
              textAlign: "center",
            }}
          >
            Get the code from your mentor or class schedule
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
