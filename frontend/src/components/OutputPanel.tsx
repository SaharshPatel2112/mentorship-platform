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
}

const PISTON_LANGUAGES: Record<string, { language: string; version: string }> =
  {
    javascript: { language: "javascript", version: "18.15.0" },
    typescript: { language: "typescript", version: "5.0.3" },
    python: { language: "python", version: "3.10.0" },
    java: { language: "java", version: "15.0.2" },
    cpp: { language: "c++", version: "10.2.0" },
  };

export default function OutputPanel({
  code,
  language,
  socket,
  sessionId,
  height = 200,
}: Props) {
  const [output, setOutput] = useState<OutputResult | null>(null);
  const [running, setRunning] = useState(false);
  const [minimized, setMinimized] = useState(false);

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
    if (!code.trim()) return;
    setRunning(true);
    setOutput(null);
    setMinimized(false);

    const pistonLang = PISTON_LANGUAGES[language];

    if (!pistonLang) {
      const result = {
        stdout: "",
        stderr: `Language "${language}" is not supported.`,
        code: 1,
      };
      setOutput(result);
      socket?.emit("code:output", { sessionId, result });
      setRunning(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: pistonLang.language,
            version: pistonLang.version,
            code,
          }),
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
      className="output-panel"
      style={{ height: minimized ? "38px" : `${height}px` }}
    >
      <div className="output-header">
        <div className="output-header-left">
          <span className="output-title">▶ Output</span>
          <button className="run-btn" onClick={handleRun} disabled={running}>
            {running ? "⏳ Running..." : "▶ Run Code"}
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

      {!minimized && (
        <div className="output-content">
          {running && <div className="output-running">⏳ Running code...</div>}

          {!running && !output && (
            <div className="output-empty">
              Click "▶ Run Code" to execute · Output syncs to both users
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
                <div className="output-empty">
                  ✅ Code ran successfully with no output
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
