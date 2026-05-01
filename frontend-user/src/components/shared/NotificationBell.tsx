import { Bell } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import api from "../../lib/api"

export default function NotificationBell() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => api.get("/notifications", { params: { limit: 10 } }).then((r) => r.data),
    refetchInterval: 30000,
  })

  const markAllRead = useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  })

  const unreadCount = data?.unread_count || 0
  const notifications = data?.notifications || []

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="font-bold text-gray-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No notifications yet</div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markRead.mutate(n.id)
                      setOpen(false)
                      navigate(n.action_url)
                    }}
                    className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3 transition ${
                      !n.is_read ? "border-l-2 border-l-blue-500 bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!n.is_read ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => { setOpen(false); navigate("/notifications") }}
              className="w-full p-2 text-xs font-semibold text-center text-gray-500 hover:bg-gray-50 border-t border-gray-100 transition"
            >
              See all notifications
            </button>
          </div>
        </>
      )}
    </div>
  )
}
