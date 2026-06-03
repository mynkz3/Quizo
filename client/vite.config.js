import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces so phones on the same Wi-Fi can reach the dev
    // server at http://<pc-ip>:5173.
    host: true,
  },
})
