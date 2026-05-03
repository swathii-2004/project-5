import { useEffect } from "react"
import { toast } from "sonner"
import api from "../lib/axios"
import { useAuthStore } from "../store/authStore"
import { requestNotificationPermission, onForegroundMessage } from "../lib/firebase"

export function useFirebaseMessaging() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return

    requestNotificationPermission(async (token) => {
      try {
        await api.put("/users/me/fcm-token", { fcm_token: token })
      } catch (err) {
        console.warn("Failed to update FCM token", err)
      }
    })

    onForegroundMessage((payload) => {
      if (payload.notification) {
        toast(payload.notification.title, {
          description: payload.notification.body,
        })
      }
    })
  }, [isAuthenticated])
}
