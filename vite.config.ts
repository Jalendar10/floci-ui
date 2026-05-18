import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/floci': {
        target: 'http://localhost:4566',
        rewrite: (path) => path.replace(/^\/floci/, ''),
        changeOrigin: true,
      },
    },
  },
})
