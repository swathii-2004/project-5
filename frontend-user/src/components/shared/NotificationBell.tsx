import { Bell, CheckCircle2, MessageSquare, AlertCircle, ShoppingBag } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import api from "../../lib/axios"

const iconMap: Record<string, any> = {
  reservation: ShoppingBag,
  chat: MessageSquare,
  emergency: AlertCircle,
  success: CheckCircle2,
}

export default function NotificationBell() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => api.get("/notifications", { params: { limit: 10 } }).then((r) => r.data),
    refetchInterval: 15000,
  })

  const markAllRead = useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const unreadCount = data?.unread_count || 0
  const notifications = data?.notifications || []

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-all group"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'group-hover:rotate-12' : ''} transition-transform`} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-500/20 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" 
              onClick={() => setOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5"
            >
              <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <span className="font-black text-gray-900 text-sm tracking-tight">Activity Feed</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-3">
                      <Bell className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inbox Empty</p>
                  </div>
                ) : (
                  notifications.map((n: any) => {
                    const Icon = iconMap[n.type] || Bell
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markRead.mutate(n.id)
                          setOpen(false)
                          navigate(n.action_url)
                        }}
                        className={`p-4 border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer flex gap-4 transition-all ${
                          !n.is_read ? "bg-indigo-50/30" : ""
                        }`}
                      >
                        <div className={`p-2 h-fit rounded-xl ${!n.is_read ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-tight ${!n.is_read ? "font-black text-gray-900" : "font-bold text-gray-700"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 font-medium leading-relaxed">{n.message}</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <button
                onClick={() => { setOpen(false); navigate("/notifications") }}
                className="w-full py-4 text-[10px] font-black text-center text-gray-400 hover:text-gray-900 uppercase tracking-[0.2em] bg-gray-50/30 border-t border-gray-50 transition"
              >
                View History
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
