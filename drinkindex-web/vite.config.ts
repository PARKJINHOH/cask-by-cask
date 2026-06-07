import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 단일 chunk 가 600KB+ 가 되면 초기 로딩이 느려짐 → vendor 단위로 분리해서
    // (1) 캐시 hit rate ↑  (2) 페이지 단위 parallel download ↑
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return
          if (id.includes('@tiptap'))                return 'vendor-tiptap'
          if (id.includes('react-router'))           return 'vendor-router'
          if (id.includes('@tanstack'))              return 'vendor-query'
          if (id.includes('i18next'))                return 'vendor-i18n'
          if (id.includes('react-hook-form')
              || id.includes('@hookform')
              || id.includes('/zod/'))               return 'vendor-form'
          if (id.includes('@headlessui'))            return 'vendor-ui'
          if (id.includes('@dnd-kit'))               return 'vendor-dnd'
          if (id.includes('recharts'))               return 'vendor-charts'
          if (id.includes('swiper'))                 return 'vendor-swiper'
          if (id.includes('dompurify')
              || id.includes('jsoup'))               return 'vendor-sanitize'
          if (id.includes('react-dom')
              || id.includes('/react/'))             return 'vendor-react'
          // 그 외 node_modules 는 default vendor chunk
          return 'vendor'
        },
      },
    },
    // vendor-tiptap 등 큰 라이브러리 단독 chunk 는 600KB 넘을 수 있어 임계값 완화
    chunkSizeWarningLimit: 800,
  },
  server: {
    proxy: {
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/notices/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/popups/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/banners/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/emojis/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/profiles/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/inquiries/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/feedbacks/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/faq': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/byob': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/events': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/admin/events': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/score-history': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/ranking': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/bottles': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/price-reports': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/price-alerts': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/stores': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/admin/price-reports': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/admin/stores': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
