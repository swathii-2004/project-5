import axios from "axios"
import { useAuthStore } from "../store/authStore"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== "/auth/refresh") {
      originalRequest._retry = true
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {}, { withCredentials: true })
        const { access_token } = response.data
        const existingUser = useAuthStore.getState().user
        
        // Parse JWT to verify it belongs to the same user
        try {
          const payload = JSON.parse(atob(access_token.split('.')[1]))
          if (existingUser && payload.user_id !== existingUser.id) {
            throw new Error("Session mismatch across tabs")
          }
        } catch (e) {
          throw new Error("Invalid token or session mismatch")
        }

        useAuthStore.getState().setAuth(existingUser, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().logout()
        window.location.href = "/login"
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default api
