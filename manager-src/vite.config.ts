import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// El panel se sirve desde /manager por el backend Go.
// `base: '/manager/'` hace que los assets se referencien con ese prefijo.
export default defineConfig({
  base: '/manager/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev: el backend Go expone la API en :4000. Vite proxea esos paths.
      '^/(instance|webhook|chat|group|message|send|user|community|label|newsletter|poll|call|server|ws)': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
