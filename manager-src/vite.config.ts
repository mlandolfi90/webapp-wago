import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// El backend Go sirve el panel desde /manager — los assets deben tener
// ese prefijo para que el browser los pida en la URL correcta.
export default defineConfig({
  base: "/manager/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev: vite proxea endpoints conocidos del backend Go en :4000.
      "^/(instance|webhook|chat|group|message|send|user|community|label|newsletter|poll|call|server|ws)":
        {
          target: "http://localhost:4000",
          changeOrigin: true,
          ws: true,
        },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run")) {
            return "vendor-router"
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query"
          }
          if (id.includes("node_modules/@radix-ui") || id.includes("node_modules/@evoapi")) {
            return "vendor-radix"
          }
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "vendor-i18n"
          }
        },
      },
    },
  },
})
