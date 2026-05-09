// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/osetrova-house/' : '/',
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@react-three/fiber')) return 'react-three-fiber';
          if (id.includes('@react-three/drei') || id.includes('three-stdlib')) return 'react-three-drei';
          if (id.includes('three')) return 'three';
          if (id.includes('react') || id.includes('react-dom')) return 'react';
          return 'vendor';
        },
      },
    },
  },
}))
