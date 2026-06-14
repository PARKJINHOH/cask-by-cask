import { Component, ErrorInfo, ReactNode } from 'react'
import ServerErrorPage from '@/pages/ServerErrorPage'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 전역 React Error Boundary.
 * 렌더 트리에서 발생한 런타임 에러를 catch 하여 500 페이지로 fallback.
 * - chunk load 실패(배포 직후 자주 발생) 시 자동 리로드 시도
 * - 그 외 에러는 ServerErrorPage 노출
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 배포 직후 chunk hash 변경 → 기존 SPA 가 못 받는 케이스.
    // 단, chunk 가 실제로 404(롤백·파일 누락)면 reload→실패→reload 무한루프에 빠진다.
    // → 직전 재시도가 10초 이내면(=리로드했는데 또 실패) 억제하고 ServerErrorPage 로 fallback.
    //   10초가 지난 뒤의 실패(세션 중 새 배포 등)는 정상적으로 다시 1회 리로드.
    if (error.message?.match(/chunk|loading|dynamically imported/i)) {
      const last = Number(sessionStorage.getItem('chunk-reload-ts') ?? 0)
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem('chunk-reload-ts', String(Date.now()))
        console.warn('Chunk load failed — reloading once')
        window.location.reload()
      } else {
        console.error('[ErrorBoundary] Chunk load failed again after reload', error)
      }
      return
    }
    // 운영 환경에서는 외부 에러 트래커(Sentry 등)로 전송
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return <ServerErrorPage resetError={this.resetError} />
    }
    return this.props.children
  }
}
