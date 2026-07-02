import type { Metadata } from 'next'
import '@/index.css'

export const metadata: Metadata = {
  title: 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티',
  description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐바캐)입니다.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티',
    description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐바캐)입니다.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-879K3LVK58"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-879K3LVK58');
            `,
          }}
        />
        {/* Pretendard 폰트 웹폰트 적용 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="antialiased">
        {/* 기존 Vite React SPA가 id="root" 엘리먼트를 찾거나 마운트할 수 있도록 보존 */}
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
