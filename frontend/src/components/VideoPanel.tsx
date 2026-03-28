"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import "./video.css";

interface Props {
  sessionId: string;
  socket: Socket | null;
  role: "mentor" | "student";
}

// Free Google STUN server — helps find public IP behind router/firewall
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

type CallStatus = "idle" | "connecting" | "connected" | "error";

export default function VideoPanel({ sessionId, socket, role }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CallStatus>("idle");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [error, setError] = useState("");

  // ── Get camera + mic from browser ─────────────────────────
  const getLocalStream = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      // Show your own camera in the small overlay box
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Camera/mic error:", err);
      setError("Could not access camera or microphone. Check permissions.");
      setStatus("error");
      return null;
    }
  };

  // ── Create RTCPeerConnection ───────────────────────────────
  const createPeerConnection = (stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add all local tracks (video + audio) to connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // When browser finds a network path → send to other person via socket
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit("video:ice", {
          sessionId,
          candidate: e.candidate,
        });
      }
    };

    // When remote video arrives → attach to remote video element
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setStatus("connected");
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log("WebRTC state:", pc.connectionState);
      if (pc.connectionState === "connected") setStatus("connected");
      if (pc.connectionState === "connecting") setStatus("connecting");
      if (pc.connectionState === "failed") setStatus("error");
    };

    pcRef.current = pc;
    return pc;
  };

  // ── Mentor starts call ─────────────────────────────────────
  const startCall = async () => {
    try {
      setStatus("connecting");
      setError("");

      const stream = await getLocalStream();
      if (!stream || !socket) return;

      const pc = createPeerConnection(stream);

      // Create SDP offer — describes what mentor's browser can do
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to student via socket
      socket.emit("video:offer", { sessionId, offer });

      // Tell student we are ready
      socket.emit("video:ready", { sessionId });
    } catch (err) {
      console.error("Error starting call:", err);
      setError("Failed to establish connection.");
      setStatus("error");
    }
  };

  // ── Socket event listeners ─────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Student receives offer from mentor → creates answer
    socket.on(
      "video:offer",
      async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
        try {
          console.log("Received video offer");
          setStatus("connecting");

          const stream = await getLocalStream();
          if (!stream) return;

          const pc = createPeerConnection(stream);

          // Set mentor's description as remote
          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          // Create answer — student's browser description
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Send answer back to mentor
          socket.emit("video:answer", { sessionId, answer });
        } catch (err) {
          console.error("Error handling video offer:", err);
        }
      },
    );

    // Mentor receives answer from student
    socket.on(
      "video:answer",
      async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        try {
          console.log("Received video answer");
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(answer),
            );
          }
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      },
    );

    // Both receive ICE candidates → add to peer connection
    // This helps establish the best network path
    socket.on(
      "video:ice",
      async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("ICE candidate error:", err);
          }
        }
      },
    );

    // Mentor is ready — student auto-joins call
    socket.on("video:ready", async () => {
      console.log("Mentor is ready — auto joining...");
    });

    return () => {
      socket.off("video:offer");
      socket.off("video:answer");
      socket.off("video:ice");
      socket.off("video:ready");
    };
  }, [socket, sessionId]);

  // ── Cleanup on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, []);

  // ── Mic toggle ─────────────────────────────────────────────
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  // ── Camera toggle ──────────────────────────────────────────
  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOn(track.enabled);
    }
  };

  const statusDotClass =
    status === "connected"
      ? "connected"
      : status === "connecting"
        ? "connecting"
        : "";

  return (
    <div className="video-panel">
      {/* Header */}
      <div className="video-header">
        <span className="video-header-title">📹 Video Call</span>
        <div className={`video-status-dot ${statusDotClass}`} />
      </div>

      {/* Video streams */}
      <div className="video-streams">
        {status === "idle" || status === "error" ? (
          <div className="video-placeholder">
            <div className="video-avatar-circle">
              {role === "mentor" ? "👨‍🏫" : "👨‍💻"}
            </div>
            <p className="video-placeholder-text">
              {status === "error"
                ? "Camera error"
                : role === "mentor"
                  ? "Click Start Call to begin"
                  : "Waiting for mentor to start call..."}
            </p>
            {error && <p className="video-error">{error}</p>}
          </div>
        ) : (
          <>
            {/* Remote video — full panel */}
            <video
              ref={remoteVideoRef}
              className="video-remote"
              autoPlay
              playsInline
            />
            {/* Local video — small overlay */}
            <div className="video-local-wrapper">
              <video
                ref={localVideoRef}
                className="video-local"
                autoPlay
                playsInline
                muted
              />
            </div>
          </>
        )}

        {/* Show local preview even in idle if stream active */}
        {status === "idle" && localStreamRef.current && (
          <div className="video-local-wrapper">
            <video
              ref={localVideoRef}
              className="video-local"
              autoPlay
              playsInline
              muted
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="video-controls">
        {role === "mentor" && status === "idle" && (
          <button className="video-start-btn" onClick={startCall}>
            📞 Start Call
          </button>
        )}

        {status !== "idle" && (
          <>
            <button
              className={`video-ctrl-btn ${micOn ? "" : "off"}`}
              onClick={toggleMic}
            >
              {micOn ? "🎤" : "🔇"}
              <span>{micOn ? "Mute" : "Unmuted"}</span>
            </button>

            <button
              className={`video-ctrl-btn ${cameraOn ? "" : "off"}`}
              onClick={toggleCamera}
            >
              {cameraOn ? "📷" : "🚫"}
              <span>{cameraOn ? "Camera" : "Off"}</span>
            </button>
          </>
        )}

        {status === "error" && (
          <button className="video-start-btn" onClick={startCall}>
            🔄 Retry
          </button>
        )}
      </div>
    </div>
  );
}
