/**
 * 서버 이미지 URL을 파일로 내려받는다.
 *
 * `<a href download>` 를 이미지 URL에 직접 걸면 브라우저가 다운로드 대신 새 탭에서 열어 버리는
 * 경우가 많다(같은 오리진이라도 Content-Disposition 이 attachment 가 아니면 대부분 그렇다).
 * 그래서 fetch 로 받아 Blob 을 만들고, 그 Blob 을 가리키는 임시 로컬 주소로 내려받는다 —
 * 포토카드 편집기의 "내 기기에 저장"(PhotoCardPage.download)과 같은 방식이다.
 *
 * 이 경로는 항상 같은 오리진(nginx 가 페이지와 API 를 같은 도메인으로 묶는다)이라 CORS 문제가 없다.
 */
export const downloadImageUrl = async (url: string, fileName: string): Promise<void> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`download failed: ${response.status}`)
  const blob = await response.blob()

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor) // Firefox 는 문서에 붙어 있어야 click() 이 먹는다
  anchor.click()
  anchor.remove()
  // 브라우저가 다운로드를 실제로 읽어 갈 시간을 준 뒤 해제한다.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

/** URL의 확장자를 그대로 따온다 — 없으면 webp로 가정한다(서버가 대부분 webp로 서빙한다). */
export const fileNameFromImageUrl = (url: string, prefix: string): string => {
  const match = /\.([a-zA-Z0-9]+)(?:[?#]|$)/.exec(url)
  const ext = match?.[1]?.toLowerCase() || 'webp'
  return `${prefix}.${ext}`
}
