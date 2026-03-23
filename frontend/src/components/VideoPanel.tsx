'use client'

import './video.css'

interface Props {
  sessionId: string
}

export default function VideoPanel({ sessionId }: Props) {
  return (
    <div className="video-panel">
      <div className="video-header">
        <span>📹 Video Call</span>
        <span className="video-status">Coming Day 6</span>
      </div>

      <div className="video-placeholder">
        <div className="video-avatar">🎥</div>
        <p>Video call will appear here</p>
        <span>Session: {sessionId.slice(0, 8)}...</span>
      </div>

      <div className="video-controls">
        <button className="video-ctrl-btn" disabled>🎤 Mic</button>
        <button className="video-ctrl-btn" disabled>📷 Camera</button>
      </div>
    </div>
  )
}