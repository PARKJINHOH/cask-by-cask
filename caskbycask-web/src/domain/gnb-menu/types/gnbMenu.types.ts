/** 관리자 목록 응답 — 저장된 설정 행. 행이 없는 카탈로그 키는 노출(true)로 간주한다. */
export interface AdminGnbMenuItem {
  menuKey: string
  isVisible: boolean
}

declare global {
  interface Window {
    /**
     * SSR(app/layout.tsx)이 심어 주는 숨김 메뉴 키 시드.
     *
     * 이게 없으면 SPA 가 마운트되는 첫 프레임에는 노출 설정을 몰라 숨긴 메뉴가
     * 잠깐 보였다가 사라진다. React Query 의 initialData 로 써서 깜빡임을 없앤다.
     */
    __GNB_HIDDEN__?: string[]
  }
}

export {}
