import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import userRoutes from './routes/user.routes'
import sessionRoutes from './routes/session.routes'
import scheduleRoutes from './routes/schedule.routes'
import { setupSessionSocket } from './socket/sessionSocket'

dotenv.config()

const app        = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin:      '*',
    methods:     ['GET', 'POST'],
    credentials: false,
  },
})

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)

    const allowed = [
      'http://localhost:3000',
      'https://mentorship-platform-topaz.vercel.app',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean)

    if (allowed.includes(origin)) {
      callback(null, true)
    } else {
      console.log('Blocked origin:', origin)
      callback(null, true)
    }
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())

// Routes
app.use('/users',     userRoutes)
app.use('/sessions',  sessionRoutes)
app.use('/schedules', scheduleRoutes)

app.get('/health', (req, res) => {
  res.json({
    status:    'Server is running ✅',
    timestamp: new Date().toISOString(),
  })
})

// Socket.io
setupSessionSocket(io)

const PORT = process.env.PORT || 5000

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
})

export { io }