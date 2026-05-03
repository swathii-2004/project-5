import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { MessageSquare, Send } from "lucide-react"
import { format } from "date-fns"
import { useAuthStore } from "../../store/authStore"
import { useChat } from "../../hooks/useChat"
import api from "../../lib/axios"

function ChatView({ reservationId, currentUserId }: { reservationId: string; currentUserId: string }) {
  const { messages, sendMessage, connected, loading } = useChat(reservationId, true)
  const [text, setText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!text.trim()) return
    sendMessage(text)
    setText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] md:h-[600px] bg-gray-50 relative">
      {!connected && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-amber-100 text-amber-800 text-xs py-1.5 text-center font-medium shadow-sm">
          Reconnecting...
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <div className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200 flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 max-h-32 min-h-[44px] resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!connected || !text.trim()}
          className="h-[44px] w-[44px] shrink-0 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <Send className="h-5 w-5 ml-1" />
        </button>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["reservations", "active-chats"],
    queryFn: () => api.get("/reservations/user", { params: { status: "confirmed" } }).then((r) => r.data),
  })

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading chats...</div>

  if (!reservations || reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <MessageSquare className="h-16 w-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No active chats</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          Chats appear here automatically when a vendor confirms your reservation.
        </p>
        <button
          onClick={() => navigate("/reservations")}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
        >
          View Reservations
        </button>
      </div>
    )
  }

  const activeId = selectedId || reservations[0]?.id

  return (
    <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex md:flex-row flex-col h-[calc(100vh-6rem)] md:h-[600px]">
      {/* Sidebar */}
      <div className={`md:w-80 border-r border-gray-200 flex flex-col ${selectedId ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {reservations.map((res: any) => (
            <button
              key={res.id}
              onClick={() => setSelectedId(res.id)}
              className={`w-full text-left p-4 border-b border-gray-100 transition hover:bg-gray-50 ${
                activeId === res.id ? "bg-blue-50/50" : ""
              }`}
            >
              <div className="font-semibold text-sm text-gray-900 truncate">
                {res.items[0]?.name}
              </div>
              <div className="text-xs text-gray-500 mt-1 truncate">Vendor Chat</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className={`flex-1 flex-col ${!selectedId && reservations.length > 0 ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
          <button className="md:hidden p-1 -ml-1 text-gray-500" onClick={() => setSelectedId(null)}>
            ←
          </button>
          <div className="font-bold text-gray-900">
            {reservations.find((r: any) => r.id === activeId)?.items[0]?.name}
          </div>
        </div>
        {activeId && user?.id && <ChatView reservationId={activeId} currentUserId={user.id} />}
      </div>
    </div>
  )
}
