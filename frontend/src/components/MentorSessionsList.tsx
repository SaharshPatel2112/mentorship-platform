"use client";

import { useEffect, useState } from "react";
import { useApiToken } from "@/lib/getToken";
import "../app/dashboard/sessions.css";

interface Schedule {
  id: string;
  date: string;
  time_label: string;
  time_value: string;
  description: string;
  join_code: string;
  student_email: string;
  isNew?: boolean;
  isEditing?: boolean;
}

const toIST = (time24: string): string => {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period} IST`;
};

const emptyRow = (): Schedule => ({
  id: `new-${Date.now()}`,
  date: "",
  time_label: "",
  time_value: "",
  description: "",
  join_code: "",
  student_email: "",
  isNew: true,
  isEditing: true,
});

export default function MentorSessionsList() {
  const { authFetch } = useApiToken();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirm] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = (await authFetch("/schedules/my")) as {
          schedules: Schedule[];
        };
        if (data?.schedules) setSchedules(data.schedules);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddRow = () => {
    if (schedules.some((s) => s.isEditing)) return;
    setSchedules((prev) => [...prev, emptyRow()]);
  };

  const handleChange = (id: string, field: keyof Schedule, value: string) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;

        if (field === "time_value") {
          return { ...s, time_value: value, time_label: toIST(value) };
        }
        return { ...s, [field]: value };
      }),
    );
  };

  const handleEdit = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEditing: true } : s)),
    );
  };

  const handleCancel = (id: string, isNew?: boolean) => {
    if (isNew) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } else {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isEditing: false } : s)),
      );
    }
  };

  const handleSave = async (schedule: Schedule) => {
    if (!schedule.date) return;
    setSaving(schedule.id);

    const payload = {
      date: schedule.date,
      time_label: schedule.time_label,
      time_value: schedule.time_value,
      description: schedule.description,
      join_code: schedule.join_code,
      student_email: schedule.student_email,
    };

    try {
      if (schedule.isNew) {
        const data = (await authFetch("/schedules/create", {
          method: "POST",
          body: JSON.stringify(payload),
        })) as { schedule: Schedule };

        setSchedules((prev) =>
          prev.map((s) =>
            s.id === schedule.id
              ? { ...data.schedule, isEditing: false, isNew: false }
              : s,
          ),
        );
      } else {
        const data = (await authFetch(`/schedules/update/${schedule.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })) as { schedule: Schedule };

        setSchedules((prev) =>
          prev.map((s) =>
            s.id === schedule.id ? { ...data.schedule, isEditing: false } : s,
          ),
        );
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await authFetch(`/schedules/${id}`, { method: "DELETE" });
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      setConfirm(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleCopy = (id: string, code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
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
    <>
      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              padding: "32px",
              maxWidth: "380px",
              width: "90%",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🗑️</div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "1.1rem",
                marginBottom: "8px",
              }}
            >
              Confirm Delete
            </div>
            <div
              style={{
                color: "var(--color-text-muted)",
                fontSize: "0.875rem",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              Are you sure you want to delete this scheduled session? This
              action cannot be undone.
            </div>
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <button
                onClick={() => setConfirm(null)}
                style={{
                  padding: "10px 24px",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  fontSize: "0.875rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{
                  padding: "10px 24px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sessions-container">
        {/* Header */}
        <div className="sessions-table-header">
          <div>
            <div className="sessions-table-title">📅 Class Schedule</div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--color-text-muted)",
                marginTop: "2px",
              }}
            >
              Upcoming sessions only · Sorted by date &amp; time · IST timezone
            </div>
          </div>
          <button className="add-row-btn" onClick={handleAddRow}>
            + Add Session
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="sessions-table">
            <thead>
              <tr>
                <th style={{ width: "140px" }}>Date</th>
                <th style={{ width: "140px" }}>Time (IST)</th>
                <th>Description / Topic</th>
                <th style={{ width: "160px" }}>Join Code</th>
                <th style={{ width: "190px" }}>Student Email</th>
                <th style={{ width: "130px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr className="sessions-empty-row">
                  <td colSpan={6}>
                    <div className="sessions-empty-icon">📅</div>
                    <div className="sessions-empty-text">
                      No upcoming sessions
                    </div>
                    <div className="sessions-empty-sub">
                      Click "+ Add Session" to schedule a class
                    </div>
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className={s.isNew ? "new-row" : ""}>
                    {/* Date — calendar picker */}
                    <td>
                      {s.isEditing ? (
                        <input
                          className="table-input"
                          type="date"
                          value={s.date || ""}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) =>
                            handleChange(s.id, "date", e.target.value)
                          }
                        />
                      ) : (
                        <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                          {formatDate(s.date)}
                        </span>
                      )}
                    </td>

                    {/* Time — IST time picker */}
                    <td>
                      {s.isEditing ? (
                        <div>
                          <input
                            className="table-input"
                            type="time"
                            value={s.time_value || ""}
                            onChange={(e) =>
                              handleChange(s.id, "time_value", e.target.value)
                            }
                          />
                          {s.time_value && (
                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: "var(--color-primary)",
                                marginTop: "3px",
                                fontWeight: 500,
                              }}
                            >
                              {toIST(s.time_value)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--color-text-muted)",
                            fontWeight: 500,
                          }}
                        >
                          {s.time_label || "—"}
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td>
                      {s.isEditing ? (
                        <input
                          className="table-input"
                          placeholder="Topic or description"
                          value={s.description || ""}
                          onChange={(e) =>
                            handleChange(s.id, "description", e.target.value)
                          }
                        />
                      ) : (
                        <span
                          style={{
                            display: "block",
                            maxWidth: "220px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.875rem",
                          }}
                        >
                          {s.description || "—"}
                        </span>
                      )}
                    </td>

                    {/* Join Code */}
                    <td>
                      {s.isEditing ? (
                        <input
                          className="table-input"
                          placeholder="Paste join code"
                          value={s.join_code || ""}
                          onChange={(e) =>
                            handleChange(
                              s.id,
                              "join_code",
                              e.target.value.toUpperCase(),
                            )
                          }
                          style={{
                            fontFamily: "monospace",
                            letterSpacing: "2px",
                          }}
                        />
                      ) : s.join_code ? (
                        <div className="join-code-cell">
                          <span className="join-code-text">{s.join_code}</span>
                          <button
                            className="copy-code-btn"
                            onClick={() => handleCopy(s.id, s.join_code)}
                          >
                            {copiedId === s.id ? "✅" : "📋"}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>
                          Add via Edit
                        </span>
                      )}
                    </td>

                    {/* Student Email */}
                    <td>
                      {s.isEditing ? (
                        <input
                          className="table-input"
                          type="email"
                          placeholder="student@email.com"
                          value={s.student_email || ""}
                          onChange={(e) =>
                            handleChange(s.id, "student_email", e.target.value)
                          }
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-muted)",
                            display: "block",
                            maxWidth: "170px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.student_email || "—"}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td>
                      <div className="table-actions">
                        {s.isEditing ? (
                          <>
                            <button
                              className="tbl-btn save"
                              onClick={() => handleSave(s)}
                              disabled={saving === s.id || !s.date}
                            >
                              {saving === s.id ? "..." : "✓ Save"}
                            </button>
                            <button
                              className="tbl-btn cancel"
                              onClick={() => handleCancel(s.id, s.isNew)}
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="tbl-btn edit"
                              onClick={() => handleEdit(s.id)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="tbl-btn delete"
                              onClick={() => setConfirm(s.id)}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
