import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { sanitizeHtml } from '@/shared/utils/sanitize'

interface Props {
  html: string
  className?: string
}

// 게시글/공지 등 TipTap 본문을 읽기 화면에 렌더링.
//   - sanitizeHtml 로 2차 정제 후 출력
//   - 본문 내 술 임베드 칩(.di-spirit-embed[data-spirit-id]) 클릭 시 SPA 이동
//     (href 는 sanitize 단계에서 제거되므로 data-spirit-id 로 위임)
export default function RichContent({ html, className }: Props) {
  const navigate = useNavigate()

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const chip = (e.target as HTMLElement).closest('a.di-spirit-embed')
      if (!chip) return
      const id = chip.getAttribute('data-spirit-id')
      if (id) {
        e.preventDefault()
        navigate(`/spirits/${id}`)
      }
    },
    [navigate],
  )

  return (
    <div
      className={className}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  )
}
