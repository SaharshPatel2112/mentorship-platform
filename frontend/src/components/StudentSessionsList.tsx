"use client";

import { useEffect, useState } from "react";
import { useApiToken } from "@/lib/getToken";
import "../app/dashboard/sessions.css";

interface Schedule {
  id: string;
  date: string;
  time_label: string;
  description: string;
  join_code: string;
  student_email: string;
}

export default function StudentSessionsList() {
  const { authFetch } = useApiToken();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = (await authFetch("/schedules/assigned")) as {
          schedules: Schedule[];
        };
        if (data?.schedules) setSchedules(data.schedules);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--color-text-muted)",
        }}
      >
        Loading schedule...
      </div>
    );
  }

  return (
    <div className="sessions-container">
      <div className="sessions-table-header">
        <div>
          <div className="sessions-table-title">📅 My Upcoming Classes</div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
              marginTop: "2px",
            }}
          >
            Scheduled by your mentor
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="sessions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Topic / Description</th>
              <th>Join Code</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr className="sessions-empty-row">
                <td colSpan={4}>
                  <div className="sessions-empty-icon">📚</div>
                  <div className="sessions-empty-text">No upcoming classes</div>
                  <div className="sessions-empty-sub">
                    Your mentor will schedule sessions for you
                  </div>
                </td>
              </tr>
            ) : (
              schedules.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                    📅 {formatDate(s.date)}
                  </td>
                  <td
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {s.time_label || "—"}
                  </td>
                  <td
                    style={{
                      maxWidth: "260px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.description || "—"}
                  </td>
                  <td>
                    {s.join_code ? (
                      <div className="join-code-cell">
                        <span className="join-code-text">{s.join_code}</span>
                        <button
                          className="copy-code-btn"
                          onClick={() => handleCopy(s.id, s.join_code)}
                          title="Copy code"
                        >
                          {copiedId === s.id ? "✅" : "📋"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>
                        Not added yet
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
