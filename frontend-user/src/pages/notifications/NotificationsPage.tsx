import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCheck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import api from "../../lib/api"

export default function NotificationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => api.get("/notifications", { params: { page, limit: 20 } }).then((r) => r.data),
    keepPreviousData: true,
  })

  const markAllRead = useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  })

  if (isLoading) {
    return <div className="max-w-2xl mx-auto p-8 text-center animate-pulse">Loading notifications...</div>
  }

  const notifications = data?.notifications || []

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6" /> Notifications
        </h1>
        {data?.unread_count > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <Bell className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.is_read) markRead.mutate(n.id)
                navigate(n.action_url)
              }}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                !n.is_read ? "bg-blue-50/30" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className={`text-sm ${!n.is_read ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                  {n.title}
                </p>
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
              </div>
              <p className="text-sm text-gray-500">{n.message}</p>
              <p className="text-xs text-gray-400 mt-2">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}

      {data?.pages > 1 && (
        <div className="flex gap-2 justify-center pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {page} of {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
