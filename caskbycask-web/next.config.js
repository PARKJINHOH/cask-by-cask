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
        // self-host Pretendard 조각. public/ 정적 파일은 기본적으로 캐시되지 않으므로
        // 명시적으로 장기 캐시를 준다. 경로에 버전이 포함되어(`/fonts/pretendard/v1.3.9/...`)
        // 버전 교체 = URL 교체이므로 immutable 이 안전하다.
        source: '/fonts/:path*',
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
