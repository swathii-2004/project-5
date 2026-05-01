import { useState, useEffect } from "react"
import { useLocationStore } from "../store/locationStore"

interface GeolocationState {
  lat: number | null
  lng: number | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useGeolocation(): GeolocationState {
  const { lat, lng, setLocation } = useLocationStore()
  const [loading, setLoading] = useState(!lat)
  const [error, setError] = useState<string | null>(null)

  const getCurrentPosition = () => {
    setLoading(true)
    setError(null)
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser")
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords.latitude, position.coords.longitude)
        setLoading(false)
      },
      () => {
        setError("Location access denied. Showing all results.")
        setLoading(false)
      },
      { timeout: 10000 }
    )
  }

  useEffect(() => {
    if (!lat) getCurrentPosition()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { lat, lng, loading, error, refetch: getCurrentPosition }
}
