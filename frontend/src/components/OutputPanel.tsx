"use client";

import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";

interface OutputResult {
  stdout: string;
  stderr: string;
  code: number;
}

interface Props {
  code: string;
  language: string;
  socket: Socket | null;
  sessionId: string;
  height?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
}

const SUPPORTED = ["javascript", "python"];

export default function OutputPanel({
  code,
  language,
  socket,
  sessionId,
  height = 200,
  onResizeStart,
}: Props) {
  const [output, setOutput] = useState<OutputResult | null>(null);
  const [running, setRunning] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const isSupported = SUPPORTED.includes(language);

  // ── Listen for output from other user ─────────────────
  useEffect(() => {
    if (!socket) return;
    socket.on("code:output", (result: OutputResult) => {
      setOutput(result);
      setMinimized(false);
    });
    return () => {
      socket.off("code:output");
    };
  }, [socket]);

  const handleRun = async () => {
    if (!code.trim() || !isSupported) return;
    setRunning(true);
    setOutput(null);
    setMinimized(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language, code }),
        },
      );

      const result = await response.json();
      setOutput(result);
      socket?.emit("code:output", { sessionId, result });
    } catch {
      const result = {
        stdout: "",
        stderr: "Failed to run code. Check your connection.",
        code: 1,
      };
      setOutput(result);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      style={{
        position: minimized ? "absolute" : "relative",
        bottom: minimized ? 0 : "auto",
        left: minimized ? 0 : "auto",
        right: minimized ? 0 : "auto",
        height: minimized ? "auto" : `${height}px`,
        zIndex: minimized ? 50 : "auto",
        background: "#1e1e1e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Drag divider ── */}
      <div
        onMouseDown={onResizeStart}
        style={{
          height: "6px",
          background: "#2d2d2d",
          cursor: minimized ? "default" : "row-resize",
          flexShrink: 0,
          transition: "background 0.15s",
          display: minimized ? "none" : "block",
        }}
        onMouseEnter={(e) => {
          if (!minimized) e.currentTarget.style.background = "#6366f1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#2d2d2d";
        }}
      />

      {/* ── Header ── */}
      <div className="output-header">
        <div className="output-header-left">
          <span className="output-title">▶ Output</span>

          <button
            className="run-btn"
            onClick={handleRun}
            disabled={running || !isSupported}
            title={
              !isSupported
                ? `${language} not supported — use JavaScript or Python`
                : "Run code"
            }
            style={{
              background: !isSupported || running ? "#444" : "#2ea043",
              cursor: !isSupported || running ? "not-allowed" : "pointer",
              color: !isSupported || running ? "#666" : "#fff",
              opacity: 1,
            }}
          >
            {running
              ? "⏳ Running..."
              : !isSupported
                ? "▶ Run (not supported)"
                : "▶ Run Code"}
          </button>

          {output && (
            <button
              className="output-clear-btn"
              onClick={() => setOutput(null)}
            >
              Clear
            </button>
          )}
        </div>

        <button
          className="output-minimize-btn"
          onClick={() => setMinimized(!minimized)}
        >
          {minimized ? "▲ Show" : "▼ Hide"}
        </button>
      </div>

      {/* ── Content ── */}
      {!minimized && (
        <div className="output-content">
          {running && <div className="output-running">⏳ Running code...</div>}

          {!running && !output && (
            <div className="output-empty">
              {isSupported
                ? 'Click "▶ Run Code" to execute · Output syncs to both users'
                : `⚠️ ${language} execution not supported. Switch to JavaScript or Python to run code.`}
            </div>
          )}

          {!running && output && (
            <>
              <div className="output-info">Exit code: {output.code}</div>
              {output.stdout && (
                <div className="output-success">{output.stdout}</div>
              )}
              {output.stderr && (
                <div className="output-error">{output.stderr}</div>
              )}
              {!output.stdout && !output.stderr && (
                <div className="output-empty">✅ Code ran with no output</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
