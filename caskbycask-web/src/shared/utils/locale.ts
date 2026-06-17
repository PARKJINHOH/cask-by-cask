const LANG_KEY = 'di_lang'
const SUPPORTED_LANGS = ['ko', 'en']

// window 객체 타입 확장
declare global {
  interface Window {
    __APP_BASENAME__?: string;
    __APP_LANG__?: string;
  }
}

/**
 * 리다이렉트 예외 대상인지 확인합니다.
 * - 파일 확장자가 붙어 있는 경로 (예: .png, .js, .json, .svg, .xml 등)
 * - OAuth 콜백 경로 (/oauth/callback)
 * - API 프록시 경로 (/api/)
 * - 기타 Vite 개발서버 리소스 등
 */
export function isExcludePath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true
  if (pathname === '/oauth/callback') return true
  
  // 파일 확장자가 있는 경로 배제 (예: /vite.svg, /robots.txt, /locales/ko.json 등)
  const lastSegment = pathname.split('/').pop() || ''
  if (lastSegment.includes('.')) return true
  
  return false
}

/**
 * URL pathname에서 언어(ko, en) 정보를 추출하고 해당하는 basename을 반환합니다.
 */
export function getLocaleFromUrl(pathname: string): { lang: 'ko' | 'en' | null; basename: string } {
  // OAuth 콜백은 basename 없이 동작하도록 특별 처리
  if (pathname === '/oauth/callback') {
    return { lang: null, basename: '' }
  }

  const match = pathname.match(/^\/(ko|en)(\/|$)/)
  if (match) {
    const lang = match[1] as 'ko' | 'en'
    return { lang, basename: `/${lang}` }
  }
  return { lang: null, basename: '' }
}

/**
 * 기본 언어를 감지합니다.
 * 1. 로컬 스토리지에 저장된 값
 * 2. 브라우저 설정 언어
 * 3. 기본값 'ko'
 */
export function detectDefaultLang(): 'ko' | 'en' {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    return saved as 'ko' | 'en'
  }
  const browser = navigator.language.startsWith('ko') ? 'ko' : 'en'
  return browser as 'ko' | 'en'
}

/**
 * 현재 페이지의 URL을 적절한 언어 서브패스가 포함된 경로로 전환하여 리다이렉트합니다.
 */
export function redirectToLocale(): boolean {
  const { pathname, search, hash } = window.location

  // 예외 대상 경로는 리다이렉트하지 않음
  if (isExcludePath(pathname)) {
    return false
  }

  const { lang } = getLocaleFromUrl(pathname)
  
  // 이미 언어 서브패스가 있는 경우 리다이렉트 불필요
  if (lang) {
    return false
  }

  const targetLang = detectDefaultLang()
  
  // 원래 경로 앞에 /ko 또는 /en을 붙여서 리다이렉션
  // 예: /spirits -> /ko/spirits
  const newPath = `/${targetLang}${pathname}${search}${hash}`
  window.location.replace(newPath)
  return true
}

/**
 * 언어 변경(수동) 시 URL을 업데이트하고 로컬 스토리지를 갱신합니다.
 */
export function changeLanguage(newLang: 'ko' | 'en'): void {
  if (!SUPPORTED_LANGS.includes(newLang)) return

  localStorage.setItem(LANG_KEY, newLang)

  const { pathname, search, hash } = window.location
  const { lang, basename } = getLocaleFromUrl(pathname)

  if (lang) {
    // 기존 언어 패스를 새 언어 패스로 교체
    // 예: /ko/spirits -> /en/spirits
    const cleanPath = pathname.substring(basename.length)
    const newPath = `/${newLang}${cleanPath}${search}${hash}`
    window.location.href = newPath
  } else {
    // 혹시 서브패스가 없는 상태였다면 바로 추가
    const newPath = `/${newLang}${pathname}${search}${hash}`
    window.location.href = newPath
  }
}

// 모듈이 처음 임포트되는 시점에 즉시 실행하여 리다이렉션 처리 및 전역 변수 초기화
const hasRedirected = redirectToLocale()
if (!hasRedirected) {
  const { lang, basename } = getLocaleFromUrl(window.location.pathname)
  window.__APP_BASENAME__ = basename
  window.__APP_LANG__ = lang || detectDefaultLang()
}
