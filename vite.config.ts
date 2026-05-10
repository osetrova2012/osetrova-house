// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/osetrova-house/' : '/',
  build: {
    chunkSizeWarningLimit: 750,
  },
}))
