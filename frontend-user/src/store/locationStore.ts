import { create } from "zustand"
import { persist } from "zustand/middleware"

interface LocationState {
  lat: number | null
  lng: number | null
  lastUpdated: Date | null
  setLocation: (lat: number, lng: number) => void
  clearLocation: () => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      lat: null,
      lng: null,
      lastUpdated: null,
      setLocation: (lat, lng) => set({ lat, lng, lastUpdated: new Date() }),
      clearLocation: () => set({ lat: null, lng: null, lastUpdated: null }),
    }),
    { name: "proximart-location" }
  )
)
