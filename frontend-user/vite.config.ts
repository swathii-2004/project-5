import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  console.log("VITE LOADED ENV VITE_API_URL:", env.VITE_API_URL)
  return {
    plugins: [react()],
    server: {
      port: 5173,
    },
  }
})