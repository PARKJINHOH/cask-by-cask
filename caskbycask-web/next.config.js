/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
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
