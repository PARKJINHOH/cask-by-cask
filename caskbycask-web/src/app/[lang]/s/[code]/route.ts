import type { NextRequest } from 'next/server'
import { forwardSocialShortLink } from '../../../socialShortLink'

interface RouteContext {
  params: Promise<{ lang: string; code: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { lang, code } = await context.params
  if (lang !== 'ko' && lang !== 'en') {
    return forwardSocialShortLink(request, '')
  }
  return forwardSocialShortLink(request, code)
}
