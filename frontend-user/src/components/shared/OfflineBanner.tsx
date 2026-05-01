import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] bg-amber-500 text-white text-sm font-medium py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You're offline — showing last known results. Some features disabled.</span>
    </div>
  )
}
