"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Editor, { OnMount, useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Socket } from "socket.io-client";

interface Props {
  sessionId: string;
  socket: Socket | null;
  initialCode?: string;
  initialLanguage?: string;
  role: "mentor" | "student";
}

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
];

const STUDENT_CURSOR_COLOR = "rgba(255, 165, 0, 0.8)";
const MENTOR_CURSOR_COLOR = "rgba(100, 180, 255, 0.8)";
const STUDENT_SELECT_COLOR = "rgba(255, 165, 0, 0.2)";
const MENTOR_SELECT_COLOR = "rgba(100, 180, 255, 0.2)";

export default function CodeEditor({
  sessionId,
  socket,
  initialCode = "// Start coding here...\n",
  initialLanguage = "javascript",
  role,
}: Props) {
  // ── useMonaco MUST be inside the component ─────────────────
  const monaco = useMonaco();

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [language, setLanguage] = useState(initialLanguage);
  const isRemoteRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const remoteCursorDecoRef = useRef<string[]>([]);
  const remoteSelectionDecoRef = useRef<string[]>([]);

  // ── Mount ──────────────────────────────────────────────────
  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Load snapshot code after mount
    if (initialCode && initialCode !== "// Start coding here...\n") {
      editor.getModel()?.setValue(initialCode);
    }

    // Cursor position → emit
    editor.onDidChangeCursorPosition((e) => {
      if (!socket) return;
      socket.emit("cursor:change", {
        sessionId,
        userId: socket.id,
        userName: role === "mentor" ? "Mentor" : "Student",
        role,
        position: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });

    // Selection → emit
    editor.onDidChangeCursorSelection((e) => {
      if (!socket) return;
      const sel = e.selection;
      const hasSelection =
        sel.startLineNumber !== sel.endLineNumber ||
        sel.startColumn !== sel.endColumn;

      socket.emit("selection:change", {
        sessionId,
        userId: socket.id,
        userName: role === "mentor" ? "Mentor" : "Student",
        role,
        selection: hasSelection
          ? {
              startLineNumber: sel.startLineNumber,
              startColumn: sel.startColumn,
              endLineNumber: sel.endLineNumber,
              endColumn: sel.endColumn,
            }
          : null,
      });
    });
  };

  // ── Code change → debounced emit ──────────────────────────
  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (isRemoteRef.current || !socket) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        socket.emit("code:change", {
          sessionId,
          code: value || "",
          language,
        });
      }, 300);
    },
    [socket, sessionId, language],
  );

  // ── Apply remote code without resetting editor state ──────
  const applyRemoteCode = useCallback((code: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    if (model.getValue() === code) return;

    isRemoteRef.current = true;
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: code }],
      () => null,
    );
    setTimeout(() => {
      isRemoteRef.current = false;
    }, 50);
  }, []);

  // ── Socket listeners ───────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Code update from other user
    socket.on(
      "code:update",
      ({ code, language: lang }: { code: string; language: string }) => {
        applyRemoteCode(code);
        setLanguage(lang);
      },
    );

    // Initial code on room join
    socket.on(
      "code:init",
      ({ code, language: lang }: { code: string; language: string }) => {
        applyRemoteCode(code);
        setLanguage(lang);
      },
    );

    // Remote cursor
    socket.on(
      "cursor:update",
      ({
        role: remoteRole,
        position,
      }: {
        role: string;
        position: { lineNumber: number; column: number };
      }) => {
        const editorInstance = editorRef.current;
        if (!editorInstance || !monaco) return;

        const isStudent = remoteRole === "student";
        const color = isStudent ? STUDENT_CURSOR_COLOR : MENTOR_CURSOR_COLOR;
        const label = isStudent ? "● Student" : "● Mentor";

        // Inject cursor CSS dynamically
        const styleId = `remote-cursor-${remoteRole}`;
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = `
        .remote-cursor-${remoteRole}::before {
          content: '${label}';
          position: absolute;
          top: -18px;
          left: 0;
          font-size: 10px;
          font-weight: 600;
          color: ${color};
          background: rgba(0,0,0,0.7);
          padding: 1px 5px;
          border-radius: 3px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100;
        }
        .remote-cursor-line-${remoteRole} {
          border-left: 2px solid ${color} !important;
        }
      `;

        remoteCursorDecoRef.current = editorInstance.deltaDecorations(
          remoteCursorDecoRef.current,
          [
            {
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column,
              ),
              options: {
                className: `remote-cursor-line-${remoteRole}`,
                beforeContentClassName: `remote-cursor-${remoteRole}`,
                stickiness:
                  monaco.editor.TrackedRangeStickiness
                    .NeverGrowsWhenTypingAtEdges,
              },
            },
          ],
        );
      },
    );

    // Remote selection
    socket.on(
      "selection:update",
      ({
        role: remoteRole,
        selection,
      }: {
        role: string;
        selection: {
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
        } | null;
      }) => {
        const editorInstance = editorRef.current;
        if (!editorInstance || !monaco) return;

        const isStudent = remoteRole === "student";
        const bgColor = isStudent ? STUDENT_SELECT_COLOR : MENTOR_SELECT_COLOR;

        const styleId = `remote-sel-${remoteRole}`;
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = `
        .remote-selection-${remoteRole} {
          background: ${bgColor} !important;
        }
      `;

        if (!selection) {
          remoteSelectionDecoRef.current = editorInstance.deltaDecorations(
            remoteSelectionDecoRef.current,
            [],
          );
          return;
        }

        remoteSelectionDecoRef.current = editorInstance.deltaDecorations(
          remoteSelectionDecoRef.current,
          [
            {
              range: new monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.endLineNumber,
                selection.endColumn,
              ),
              options: {
                className: `remote-selection-${remoteRole}`,
                stickiness:
                  monaco.editor.TrackedRangeStickiness
                    .NeverGrowsWhenTypingAtEdges,
              },
            },
          ],
        );
      },
    );

    return () => {
      socket.off("code:update");
      socket.off("code:init");
      socket.off("cursor:update");
      socket.off("selection:update");
    };
  }, [socket, applyRemoteCode, monaco]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 16px",
          background: "#1e1e1e",
          borderBottom: "1px solid #333",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#888", fontSize: "0.8rem" }}>Language:</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            background: "#2d2d2d",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <span
          style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#666" }}
        >
          {role === "mentor" ? "👁️ Viewing" : "✏️ Editing"}
        </span>
      </div>

      {/* Editor */}
      <Editor
        height="100%"
        language={language}
        defaultValue={initialCode}
        theme="vs-dark"
        onMount={handleEditorMount}
        onChange={handleCodeChange}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          lineNumbers: "on",
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  );
}
