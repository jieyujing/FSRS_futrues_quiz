import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['quiz.jieyujing.eu.org'],
    proxy: {
      '/practice': 'http://localhost:8005',
      '/exam': 'http://localhost:8005',
      '/import': 'http://localhost:8005',
      '/questions': 'http://localhost:8005',
      '/flashcards': 'http://localhost:8005',
      '/health': 'http://localhost:8005',
      '/docs': 'http://localhost:8005',
      '/openapi.json': 'http://localhost:8005',
    },
  }
})

