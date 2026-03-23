'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

const getSocket = (): Socket => {
  if (!socket || !socket.connected) {
    socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
      {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        // Keep connection alive
        pingTimeout: 60000,
        pingInterval: 25000,
      }
    )
  }
  return socket
}

export const useSocket = () => {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null)

  useEffect(() => {
    const s = getSocket()
    setSocketInstance(s)

    return () => {
      // Do NOT disconnect — keep alive across page navigations
    }
  }, [])

  return socketInstance
}