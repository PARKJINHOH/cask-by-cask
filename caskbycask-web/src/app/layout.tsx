import type { Metadata, Viewport } from 'next'
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

/**
 * 모바일 뷰포트 설정.
 *
 * Next 기본값(width=device-width, initial-scale=1)에는 viewport-fit 이 없다.
 * CSS 사양상 viewport-fit=cover 가 없으면 env(safe-area-inset-*) 는 항상 0 이므로,
 * BottomNav·MainLayout·SpiritListPage·PhotoCardToolRail 에 이미 들어가 있는
 * safe-area 보정이 전부 무효였다. cover 를 켜야 그 값들이 실제로 계산된다.
 *
 * interactiveWidget=resizes-content 는 가상 키보드가 올라올 때 레이아웃 뷰포트까지 줄인다.
 * 기본값(resizes-visual)에서는 하단 고정 UI(BottomNav·검색바·액션바)가 키보드 뒤로 들어가
 * 방금 탭한 입력칸이 보이지 않는다. iOS 는 이 값을 무시하므로 useKeyboardInset 이 따로 보정한다.
 *
 * maximum-scale·user-scalable 은 지정하지 않는다 — 확대를 막으면 접근성이 깨진다.
 * iOS 의 '입력 포커스 시 자동 확대'는 확대 금지가 아니라 입력칸 16px 로 푼다(index.css 참고).
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#d97706',
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
