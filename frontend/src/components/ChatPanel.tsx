"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import "./chat.css";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "system" | "code";
  createdAt: string;
}

interface Props {
  sessionId: string;
  socket: Socket | null;
  currentUserId: string;
  currentUserName: string;
}

export default function ChatPanel({
  sessionId,
  socket,
  currentUserId,
  currentUserName,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on("chat:history", (history: Message[]) => {
      setMessages(
        history.map((m) => {
          const raw = m as unknown as Record<string, string>;
          return {
            id: m.id ?? raw.id,
            senderId: m.senderId ?? raw.sender_id ?? "system",
            senderName: m.senderName ?? raw.sender_name ?? "User",
            content: m.content,
            type: m.type ?? "text",
            createdAt:
              m.createdAt ?? raw.created_at ?? new Date().toISOString(),
          };
        }),
      );
    });

    socket.on("chat:receive", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("chat:history");
      socket.off("chat:receive");
    };
  }, [socket]);

  const handleSend = () => {
    if (!input.trim() || !socket) return;
    socket.emit("chat:send", {
      sessionId,
      senderId: currentUserId,
      senderName: currentUserName,
      content: input.trim(),
      type: "text",
    });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className={`chat-panel ${isMinimized ? "minimized" : ""}`}>
      <div className="chat-header">
        <span>💬 Session Chat</span>
        <button
          className="chat-minimize-btn"
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? "Expand chat" : "Minimize chat"}
        >
          {isMinimized ? "▲" : "▼"}
        </button>
      </div>

      {!isMinimized && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">No messages yet. Say hello! 👋</div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${
                  msg.type === "system"
                    ? "system"
                    : msg.senderId === currentUserId
                      ? "own"
                      : "other"
                }`}
              >
                {msg.type === "system" ? (
                  <div className="system-message">{msg.content}</div>
                ) : (
                  <>
                    <div className="message-meta">
                      <span className="message-sender">
                        {msg.senderId === currentUserId
                          ? "You"
                          : msg.senderName}
                      </span>
                      <span className="message-time">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className="message-bubble">{msg.content}</div>
                  </>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              className="chat-input"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  );
}
