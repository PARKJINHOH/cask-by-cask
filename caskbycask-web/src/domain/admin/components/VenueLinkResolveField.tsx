import { useState } from 'react'
import { useResolveVenueLink } from '@/domain/admin/hooks/useAdminVenue'
import type { VenueLinkResolveResult } from '@/domain/venue/types/venue.types'

interface Props {
  /** 좌표를 못 뽑았을 때 지오코딩에 쓸 주소. 폼의 주소 칸을 그대로 넘긴다. */
  addressHint: string
  /** 해석 성공/실패와 무관하게 결과를 그대로 넘긴다. 무엇을 채울지는 폼이 정한다. */
  onResolved: (result: VenueLinkResolveResult, pastedLink: string) => void
  inputClassName: string
}

const SOURCE_STYLE: Record<VenueLinkResolveResult['source'], string> = {
  PARSED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  EXPANDED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  // 주소 검색 결과는 자주 틀린다 — 초록으로 칠하면 확인 없이 저장하게 된다.
  GEOCODED: 'border-amber-200 bg-amber-50 text-amber-800',
  NONE: 'border-neutral-200 bg-neutral-50 text-neutral-600',
}

const SOURCE_LABEL: Record<VenueLinkResolveResult['source'], string> = {
  PARSED: '링크에서 직접',
  EXPANDED: '단축 링크 확장',
  GEOCODED: '주소 검색 — 위치 확인 필요',
  NONE: '좌표 없음',
}

/**
 * 지도 공유 링크 붙여넣기 → 좌표.
 *
 * <p>실패를 오류로 다루지 않는다. 네이버 단축 링크처럼 <b>원리상 좌표가 없는</b> 형식이 있고,
 * 그때 할 일은 에러를 띄우는 것이 아니라 아래 지도에서 핀을 찍는 것이다 — 그래서 안내 문구는
 * 항상 다음 행동을 가리킨다. 입력값도 지우지 않는다(다시 눌러 보거나 URL 칸에 옮겨 담을 수 있다).
 */
export default function VenueLinkResolveField({ addressHint, onResolved, inputClassName }: Props) {
  const [link, setLink] = useState('')
  const [result, setResult] = useState<VenueLinkResolveResult | null>(null)
  const [failed, setFailed] = useState(false)
  const resolve = useResolveVenueLink()

  const run = () => {
    const trimmed = link.trim()
    if (!trimmed || resolve.isPending) return
    setFailed(false)
    resolve.mutate(
      { link: trimmed, addressHint: addressHint.trim() || undefined },
      {
        onSuccess: (data) => {
          setResult(data)
          onResolved(data, trimmed)
        },
        // 서버가 죽었거나 네트워크가 끊긴 경우. 등록 자체를 막지는 않는다.
        onError: () => {
          setResult(null)
          setFailed(true)
        },
      },
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-neutral-200 p-4">
      <p className="text-sm font-medium text-neutral-700">공유 링크로 위치 채우기</p>

      <div className="flex gap-2">
        <input
          className={`${inputClassName} flex-1`}
          placeholder="네이버·카카오·구글 지도 공유 링크 또는 '위도, 경도'"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          // form 안이므로 Enter 가 곧 저장이 된다. 여기서는 해석만 하고 제출을 막는다.
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              run()
            }
          }}
        />
        <button
          type="button"
          onClick={run}
          disabled={!link.trim() || resolve.isPending}
          className="shrink-0 rounded-lg bg-neutral-800 px-4 text-sm font-medium text-white
            transition-colors hover:bg-neutral-900 disabled:bg-neutral-300"
        >
          {resolve.isPending ? '해석 중…' : '좌표 가져오기'}
        </button>
      </div>

      {result && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${SOURCE_STYLE[result.source]}`}>
          <span className="font-semibold">{SOURCE_LABEL[result.source]}</span>
          {result.lat != null && result.lng != null && (
            <span className="ml-2 font-mono">
              {result.lat}, {result.lng}
            </span>
          )}
          {result.message && <p className="mt-0.5">{result.message}</p>}
        </div>
      )}

      {failed && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          해석 요청이 실패했습니다. 아래 지도에서 위치를 직접 지정해주세요.
        </p>
      )}

      <div className="text-xs leading-relaxed text-neutral-400">
        <p>
          <b className="text-neutral-500">되는 것</b> · 구글 지도 주소창 URL · 네이버 지도 URL(
          <code>?c=</code> 포함) · 카카오 <code>/link/map/…</code> · <code>geo:</code> · 좌표 직접 입력
        </p>
        <p>
          <b className="text-neutral-500">안 되는 것</b> · 단축 링크(
          <code>naver.me</code>, <code>maps.app.goo.gl</code>, <code>kko.kakao.com</code>) ·
          카카오 웹 공유(<code>urlX/urlY</code> 는 위경도가 아니다) — 좌표가 링크에 없으므로
          아래 지도에서 핀을 찍으면 된다.
        </p>
      </div>
    </div>
  )
}
