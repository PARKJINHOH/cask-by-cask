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
          // TipTap 본체 + ProseMirror 코어는 에디터 전용 → 에디터가 있는 라우트에서만 로드.
          // (prosemirror-* 는 @tiptap 네임스페이스가 아니라 catch-all vendor 로 새던 것을 분리)
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap'
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
    // /api 와 /uploads 는 전부 백엔드(8080)로 프록시.
    // (경로를 하나씩 나열하면 새 엔드포인트가 추가될 때마다 누락돼 404 나므로 catch-all 로 통일)
    proxy: {
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
