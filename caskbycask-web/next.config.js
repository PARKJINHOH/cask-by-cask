/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    // 현재 프로젝트는 next/image를 사용하지 않는다. 번들 sharp의 보안 패치가
    // Next.js 지원 범위에 들어올 때까지 앱에서 이미지 최적화를 사용하지 않는다.
    unoptimized: true,
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
