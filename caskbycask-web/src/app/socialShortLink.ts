import { NextRequest, NextResponse } from 'next/server'

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080'

export async function forwardSocialShortLink(
  request: NextRequest,
  code: string,
): Promise<NextResponse> {
  if (!/^[A-Za-z0-9]+$/.test(code)) {
    return unavailable(request)
  }

  try {
    const response = await fetch(`${API_URL}/s/${encodeURIComponent(code)}`, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'manual',
    })
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      return NextResponse.redirect(location, 302)
    }
  } catch {
    // 공개 링크는 오류 페이지 대신 SNS 링크 허브로 안전하게 안내한다.
  }
  return unavailable(request)
}

function unavailable(request: NextRequest): NextResponse {
  return NextResponse.redirect(
    new URL('/ko/social?unavailable=1', request.url),
    302,
  )
}
