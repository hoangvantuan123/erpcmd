import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/renderer')

export default defineConfig({
  root,
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(root, 'src')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5183,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5184'
    }
  },
  build: {
    outDir: resolve(root, '../../cmd/desktop/frontend/dist'),
    emptyOutDir: true
  }
})
