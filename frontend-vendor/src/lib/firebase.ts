import { initializeApp } from "firebase/app"
import { getMessaging, getToken, onMessage } from "firebase/messaging"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

export async function requestNotificationPermission(
  onTokenReceived: (token: string) => void
): Promise<void> {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") return
    
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      )
    })
    
    if (token) {
      onTokenReceived(token)
    }
  } catch (error) {
    console.warn("Push notification setup failed:", error)
  }
}

export function onForegroundMessage(
  callback: (payload: any) => void
): void {
  onMessage(messaging, callback)
}

export { messaging }
