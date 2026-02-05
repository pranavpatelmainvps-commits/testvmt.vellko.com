import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/install': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/install_logs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/logs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/dns': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
