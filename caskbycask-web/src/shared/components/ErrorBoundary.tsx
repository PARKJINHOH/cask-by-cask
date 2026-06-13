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
    // 배포 직후 chunk hash 변경 → 기존 SPA 가 못 받는 케이스
    if (error.message?.match(/chunk|loading/i)) {
      console.warn('Chunk load failed — reloading')
      window.location.reload()
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
