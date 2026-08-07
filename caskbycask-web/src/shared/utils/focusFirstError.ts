import { scrollToPageTop } from './scrollToPageTop'

/**
 * 첫 오류 입력칸으로 스크롤·포커스.
 *
 * <p>모바일에서는 제출 버튼이 폼 맨 아래에 있어, 오류 문구가 화면 위쪽에만 그려지면
 * 사용자 눈에는 **"등록을 눌러도 아무 일이 없다"** 로 보인다. 눌린 순간 화면이 반드시
 * 움직이도록 이 함수를 거친다.
 *
 * <p>앵커(`data-field` / `name`)가 없는 항목이거나 접힌 영역 안에 있어 DOM 에 존재하지
 * 않을 수 있다. 그때는 최소한 폼 맨 위로 올린다. 관리자 레이아웃처럼 window 가 아니라
 * 안쪽 컨테이너가 스크롤되는 화면이 있으므로, 폴백은 `scrollToPageTop` 으로 스크롤
 * 조상을 찾아 올린다(`window.scrollTo` 는 그런 화면에서 무반응이다).
 *
 * @param fieldNames 오류가 난 필드 이름들. **표시 순서대로** 넘겨야 첫 항목이 잡힌다.
 * @param fallbackAnchor 앵커를 못 찾았을 때 기준으로 삼을 폼 표식 선택자.
 * @returns 실제로 잡은 앵커 이름. 못 찾았으면 null.
 */
export function focusFirstError(
  fieldNames: string[],
  fallbackAnchor?: string,
): string | null {
  const firstKey = fieldNames[0]
  if (!firstKey) return null

  // 렌더가 끝난 뒤에 찾아야 방금 나타난 오류 문구·필드까지 잡힌다.
  window.setTimeout(() => {
    const target = document.querySelector<HTMLElement>(
      `[data-field="${firstKey}"], [name="${firstKey}"]`,
    )
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.focus({ preventScroll: true })
      return
    }
    scrollToPageTop(fallbackAnchor ? document.querySelector<HTMLElement>(fallbackAnchor) : null)
  }, 0)

  return firstKey
}
