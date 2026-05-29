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
    // Code splitting: cada librería gorda a su propio chunk para que el
    // browser pueda cachearla independientemente de los chunks de las
    // páginas (que cambian con cada deploy). React Router, TanStack Query
    // y Radix primitives son los 3 candidatos por tamaño/estabilidad.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run')) {
            return 'vendor-router'
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query'
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix'
          }
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n'
          }
        },
      },
    },
  },
})
