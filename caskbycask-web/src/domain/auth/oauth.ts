import { authApi } from './api/authApi'
import type { SocialProvider } from './types/auth.types'

/**
 * 소셜 로그인 플로우 헬퍼 (커스텀 REST 코드교환).
 *
 * 제공자 콜백은 항상 /oauth/callback 한 곳으로 돌아오므로, 콜백 페이지가 어떤 의도였는지
 * 판별할 수 있도록 mode/provider 를 sessionStorage 에 저장한 뒤 제공자 인가 URL 로 이동한다.
 */

export const OAUTH_MODE_KEY = 'oauth_mode'
export const OAUTH_PROVIDER_KEY = 'oauth_provider'
export const OAUTH_RETURN_TO_KEY = 'oauth_return_to'
export const OAUTH_LINK_TICKET_KEY = 'oauth_link_ticket'

export type OAuthMode = 'auth' | 'link'

/** 프론트 콜백 URL — 백엔드 화이트리스트 및 제공자 콘솔 등록값과 일치해야 한다. */
export function oauthRedirectUri(): string {
  return `${window.location.origin}/oauth/callback`
}

/**
 * 소셜 인가 시작 — 인가 URL 을 받아 제공자로 리다이렉트.
 * @param mode 'auth'=로그인/가입, 'link'=마이페이지에서 현재 계정에 연동
 * @param returnTo 로그인 성공 후 돌아갈 경로(선택)
 */
export async function startOAuth(provider: SocialProvider, mode: OAuthMode, returnTo?: string): Promise<void> {
  const redirectUri = oauthRedirectUri()
  const res = await authApi.getOAuthAuthorizeUrl(provider, redirectUri)
  const url = res.data.data?.authorizeUrl
  if (!url) throw new Error('authorize url missing')

  sessionStorage.setItem(OAUTH_MODE_KEY, mode)
  sessionStorage.setItem(OAUTH_PROVIDER_KEY, provider)
  if (returnTo) sessionStorage.setItem(OAUTH_RETURN_TO_KEY, returnTo)

  window.location.href = url
}

export function clearOAuthSession() {
  sessionStorage.removeItem(OAUTH_MODE_KEY)
  sessionStorage.removeItem(OAUTH_PROVIDER_KEY)
  sessionStorage.removeItem(OAUTH_RETURN_TO_KEY)
}
