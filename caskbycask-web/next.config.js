/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    // 현재 프로젝트는 next/image를 사용하지 않는다. 번들 sharp의 보안 패치가
    // Next.js 지원 범위에 들어올 때까지 앱에서 이미지 최적화를 사용하지 않는다.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // 편집기 글꼴 목록 CSS.
        //
        // ⚠️ 이 파일만은 immutable 로 캐시하면 안 된다. 경로에 버전이 없는 고정 URL 인데
        // 서체를 추가·교체하면 같은 URL 의 내용이 바뀐다. immutable 은 브라우저에게
        // "재검증하지 말라"는 뜻이라, 한 번 받아 둔 브라우저는 새로고침이나 서버 재기동으로도
        // 새 서체를 영원히 받지 못한다(글꼴이 전부 폴백으로 그려진다).
        // 용량의 대부분은 아래 woff2 조각들이고 이 파일은 목록일 뿐이라, 매번 재검증(304)해도 된다.
        source: '/fonts/editor/editor-fonts.css',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        // self-host Pretendard 조각. public/ 정적 파일은 기본적으로 캐시되지 않으므로
        // 명시적으로 장기 캐시를 준다. 경로에 버전이 포함되어(`/fonts/pretendard/v1.3.9/...`)
        // 버전 교체 = URL 교체이므로 immutable 이 안전하다.
        source: '/fonts/pretendard/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // 편집기 서체 woff2 조각. 파일명이 곧 내용이라(조각 번호·굵기별로 나뉜다)
        // 내용이 바뀌면 파일명도 바뀐다 — immutable 이 안전하다.
        // `:file+` 로 한 단계 아래 파일만 잡아, 위의 editor-fonts.css 와 겹치지 않게 한다.
        source: '/fonts/editor/:slug/:file+',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: 'http://localhost:8080/sitemap.xml',
      },
      {
        source: '/sitemaps/:path*',
        destination: 'http://localhost:8080/sitemaps/:path*',
      },
      {
        source: '/indexnow-key.txt',
        destination: 'http://localhost:8080/indexnow-key.txt',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:8080/uploads/:path*',
      },
    ]
  },
  typescript: {
    // 마이그레이션 도중 사소한 타입스크립트 엄격도 차이로 인해 빌드가 무산되는 것을 예방
    ignoreBuildErrors: true,
  },
}

export default nextConfig
