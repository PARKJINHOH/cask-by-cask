import { NextResponse } from 'next/server'

// Next.js 웹 서버의 무중단 배포 및 systemd 헬스체크를 위한 초경량 엔드포인트
export async function GET() {
  return new NextResponse('ok', { status: 200 })
}
