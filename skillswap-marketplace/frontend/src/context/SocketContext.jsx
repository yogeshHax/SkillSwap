import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { token, user } = useAuth()
  const socketRef = useRef(null)
  const [connected,    setConnected]    = useState(false)
  const [onlineUsers,  setOnlineUsers]  = useState([])

  useEffect(() => {
    if (!token || !user) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      return
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect',    () => { setConnected(true)  })
    socket.on('disconnect', () => { setConnected(false) })
    socket.on('connect_error', (err) => {
      console.warn('[socket] connect error:', err.message)
      setConnected(false)
    })

    socket.on('user_online',  ({ userId }) =>
      setOnlineUsers(prev => [...new Set([...prev, userId])])
    )
    socket.on('user_offline', ({ userId }) =>
      setOnlineUsers(prev => prev.filter(id => id !== userId))
    )

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [token, user])

  // ── Stable helpers (use socketRef so they never go stale) ──────
  const joinChat  = useCallback((chatId) =>
    socketRef.current?.emit('join_chat',  { chatId }), [])
  const leaveChat = useCallback((chatId) =>
    socketRef.current?.emit('leave_chat', { chatId }), [])

  const emitTyping = useCallback((chatId, receiverId, isTyping) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit(isTyping ? 'typing' : 'stop_typing', { chatId, receiverId })
  }, [])

  // Subscribe helpers — return cleanup function
  const onMessage = useCallback((cb) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('new_message', cb)
    return () => s.off('new_message', cb)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  // NOTE: socketRef.current changes but ref itself is stable; cb is always
  //       registered against the *current* socket at call time.

  const onBookingUpdate = useCallback((cb) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('new_booking',    cb)
    s.on('booking_update', cb)
    return () => {
      s.off('new_booking',    cb)
      s.off('booking_update', cb)
    }
  }, [])

  const onTyping = useCallback((cb) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('user_typing',      cb)
    s.on('user_stop_typing', cb)
    return () => {
      s.off('user_typing',      cb)
      s.off('user_stop_typing', cb)
    }
  }, [])

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      onlineUsers,
      joinChat,
      leaveChat,
      emitTyping,
      onMessage,
      onTyping,
      onBookingUpdate,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
