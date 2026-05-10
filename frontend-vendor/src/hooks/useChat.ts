import { useState, useEffect, useRef, useCallback } from "react"
import { useAuthStore } from "../store/authStore"

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  message: string
  created_at: string
}

interface UseChatReturn {
  messages: Message[]
  sendMessage: (text: string) => void
  connected: boolean
  loading: boolean
}

export function useChat(reservationId: string, enabled: boolean): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout>()
  const reconnectDelay = useRef(1000)

  const connect = useCallback(() => {
    const token = useAuthStore.getState().token
    if (!token || !enabled) return

    const wsUrl = `${import.meta.env.VITE_WS_URL}/api/v1/ws/chat/${reservationId}?token=${token}`
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = (event) => {
      if (event.target !== ws.current) return
      setConnected(true)
      setLoading(false)
      reconnectDelay.current = 1000
    }

    ws.current.onmessage = (event) => {
      if (event.target !== ws.current) return
      const data = JSON.parse(event.data)
      if (data.type === "history") {
        setMessages(data.messages)
        setLoading(false)
      } else if (data.type === "message") {
        setMessages((prev) => {
          if (prev.some(m => m.id === data.id)) return prev
          return [...prev, data]
        })
      }
    }

    ws.current.onclose = (event) => {
      if (event.target === ws.current) {
        setConnected(false)
        setLoading(false)
      }
      
      // Only reconnect if this was the current socket and we are still enabled
      if (event.target === ws.current && enabled) {
        reconnectTimeout.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
          connect()
        }, reconnectDelay.current)
      }
    }

    ws.current.onerror = (event) => {
      if (event.target !== ws.current) return
      console.error('[useChat] WebSocket error')
      ws.current?.close()
    }
  }, [reservationId, enabled])

  useEffect(() => {
    if (enabled) connect()
    return () => {
      clearTimeout(reconnectTimeout.current)
      ws.current?.close()
    }
  }, [connect, enabled])

  const sendMessage = useCallback((text: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ text }))
    }
  }, [])

  return { messages, sendMessage, connected, loading }
}
