import type { Metadata } from 'next'
import { headers } from 'next/headers'
// Pretendard 는 self-host 한다(가변 + dynamic subset, 92조각).
// 번들된 CSS 로 들어가므로 서드파티 연결과 별도 CSS 요청이 모두 사라진다.
// 자산 갱신은 `npm run fonts:sync` — 생성 파일은 직접 편집하지 않는다.
import '@/fonts/pretendard.css'
import '@/index.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.caskbycask.net'),
  title: 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티',
  description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐바캐)입니다.',
  openGraph: {
    title: 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티',
    description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐바캐)입니다.',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const requestHeaders = await headers()
  const lang = requestHeaders.get('x-caskbycask-lang') === 'en' ? 'en' : 'ko'

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js-enabled');`,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `html.js-enabled [data-seo-fallback]{display:none!important}`,
          }}
        />
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
      </head>
      <body className="antialiased">
        {/* 기존 Vite React SPA가 id="root" 엘리먼트를 찾거나 마운트할 수 있도록 보존 */}
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
