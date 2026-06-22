import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execSync } from 'child_process'

// Build version = git SHA（CLI 部署走本機 vercel build，execSync 取本機 git；fallback dev）。同 GTC 範本。
const gitSha = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  (() => { try { return execSync('git rev-parse HEAD').toString() } catch { return 'dev' } })()
).trim().slice(0, 7)

export default defineConfig({
  define: { __GIT_SHA__: JSON.stringify(gitSha) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
})
