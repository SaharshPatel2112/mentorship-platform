# MentorSpace 🚀

A real-time 1-on-1 mentorship platform with live code editor, video call, and chat.

## 🌐 Live Demo

- **Frontend:** https://mentorship-platform-topaz.vercel.app
- **Backend:** https://mentorship-platform-v0x1.onrender.com

## 🎯 Features

- **Authentication** — Clerk-based login with Mentor/Student roles
- **Live Code Editor** — Monaco Editor with real-time sync via Socket.io
- **Cursor Sync** — See other user's cursor position and selection in real time
- **Video Call** — 1-on-1 WebRTC video with mic/camera toggle
- **Session Chat** — Real-time chat with timestamps, deleted after session ends
- **Session Management** — Create sessions, share join codes, rejoin anytime
- **Class Schedule** — Mentor plans upcoming sessions, student sees schedule

## 🛠️ Tech Stack

### Frontend

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Monaco Editor
- Socket.io Client
- WebRTC
- Clerk (Auth)

### Backend

- Node.js + Express.js
- Socket.io
- Supabase (PostgreSQL)
- Clerk Backend SDK
- TypeScript

### Infrastructure

- Frontend → Vercel
- Backend → Render
- Database → Supabase

## 🚀 Local Setup

### Prerequisites

- Node.js 18+
- npm

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in your env variables
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your env variables
npm run dev
```

## 📁 Project Structure

```
mentorship-platform/
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/       # Pages
│   │   ├── components/# Reusable components
│   │   ├── hooks/     # Custom hooks
│   │   └── lib/       # Utilities
└── backend/           # Express server
    └── src/
        ├── routes/    # API routes
        ├── socket/    # Socket.io events
        ├── middleware/# Auth middleware
        └── config/    # Supabase config
```
