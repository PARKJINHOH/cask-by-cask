import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'

/**
 * 로그인이 필요한 동작의 공통 관문.
 *
 * 그동안 대부분의 "로그인 필요" 버튼이 `navigate('/login')` 만 호출해 **돌아갈 위치를 넘기지 않았고**,
 * 그래서 로그인 후 항상 홈으로 떨어졌다. 여기로 모아 두면 그 실수가 반복되지 않는다.
 *
 * 로그인 페이지는 이미 `location.state.from` 을 읽어 되돌려 보낸다(LoginPage 참고) —
 * 이 훅은 그 규약에 맞춰 **현재 위치를 통째로**(search·hash 포함) 실어 준다.
 */

/** react-router 의 `state.from` 규약. Location 이거나, 최소한 pathname 을 가진 객체다. */
type ReturnLocation = Pick<Location, 'pathname'> & Partial<Pick<Location, 'search' | 'hash'>>

/** 로그인 후 이 경로들로 되돌리면 다시 로그인 화면이 뜨거나 흐름이 꼬인다. */
const LOOPING_PREFIXES = ['/login', '/signup', '/oauth']

/**
 * `state.from` → 이동 가능한 경로 문자열.
 *
 * `pathname` 만 읽던 과거 구현은 `?post=123` 처럼 **쿼리에 화면 상태를 담는 페이지**
 * (이미지 갤러리 모달 등)를 되돌리지 못했다. search·hash 까지 살린다.
 *
 * 다음은 홈(`/`)으로 떨어뜨린다:
 *   - 절대 URL·프로토콜 상대 주소(`//evil.com`, `/\evil.com`) → 열린 리다이렉트 방지
 *   - 로그인·가입·OAuth 경로 → 로그인 직후 다시 로그인 화면으로 가는 루프 방지
 */
export const toReturnPath = (from: unknown): string => {
  if (!from || typeof from !== 'object') return '/'

  const location = from as Partial<ReturnLocation>
  const rawPathname = typeof location.pathname === 'string' ? location.pathname : ''
  const search = typeof location.search === 'string' ? location.search : ''
  const hash = typeof location.hash === 'string' ? location.hash : ''

  const target = `${rawPathname}${search}${hash}`
  if (!target.startsWith('/')) return '/'
  // 두 번째 글자가 / 또는 \ 이면 브라우저가 외부 호스트로 해석한다.
  if (target.length > 1 && (target[1] === '/' || target[1] === '\\')) return '/'

  // 릴레이 과정에서 전체 경로가 pathname 하나에 담겨 오기도 하므로(SignupPage),
  // 루프 판정은 항상 실제 경로 부분만 떼어 내서 한다.
  const pathOnly = target.split(/[?#]/)[0]
  if (LOOPING_PREFIXES.some((prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`))) {
    return '/'
  }

  return target
}

/** `<Link to="/login">` 의 state prop 에 그대로 넘긴다. */
export const loginRouteState = (location: ReturnLocation) => ({ from: location })

/**
 * 로그인 상태면 action 을 실행하고, 아니면 로그인 화면으로 보낸다.
 *
 * @returns 로그인 상태여서 action 이 실행됐으면 true. 로그인 화면으로 보냈으면 false.
 *
 * @example
 * const requireLogin = useRequireLogin()
 * <button onClick={() => requireLogin(() => setUploadOpen(true))}>사진 올리기</button>
 */
export const useRequireLogin = () => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback((action?: () => void): boolean => {
    if (isLoggedIn) {
      action?.()
      return true
    }
    navigate('/login', { state: loginRouteState(location) })
    return false
  }, [isLoggedIn, location, navigate])
}
