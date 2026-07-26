import type { NextRequest } from 'next/server'
import { forwardSocialShortLink } from '../../socialShortLink'

interface RouteContext {
  params: Promise<{ code: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params
  return forwardSocialShortLink(request, code)
}
