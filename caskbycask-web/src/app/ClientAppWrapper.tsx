'use client'

import { ReactNode, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import '@/shared/utils/i18n' // 클라이언트 사이드 다국어 초기화

// 기존 React Router DOM 기반의 Vite SPA 코드를 클라이언트 사이드에서만 안전하게 실행하기 위한 래퍼입니다.
// ssr: false 설정을 부여하여 서버 단의 Node.js 컴파일 단계에서 window/document 미정의 에러가 전파되는 것을 완벽히 방지합니다.
const ClientApp = dynamic(() => import('@/App'), { ssr: false })

export default function ClientAppWrapper({ children }: { children?: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {!mounted && children}
      <ClientApp />
    </>
  )
}
