/**
 * 왼쪽 도구 레일. 고른 도구가 오른쪽 패널의 내용을 정한다.
 *
 * 캔버스에서 요소를 클릭하면 그 요소에 맞는 도구로 자동 전환된다(PhotoCardPage).
 * 선택된 요소의 속성은 도구와 무관하게 패널 맨 위에 늘 붙는다.
 */
export type PhotoCardTool =
  | 'select' | 'template' | 'photo' | 'text' | 'element' | 'data' | 'card' | 'layer' | 'export'

export interface PhotoCardToolOption {
  key: PhotoCardTool
  labelKey: string
  /** 24×24 뷰박스 SVG path */
  path: string
  /** 레일에서 위 항목과 사이를 띄운다 */
  separated?: boolean
}

export const PHOTO_CARD_TOOLS: PhotoCardToolOption[] = [
  { key: 'select', labelKey: 'photoCard.toolSelect', path: 'M5.5 2.8l13.2 7.6-5.6 1.4-1.4 5.6L5.5 2.8z' },
  { key: 'template', labelKey: 'photoCard.toolTemplate', path: 'M4 4h7v7H4V4zm9 0h7v4h-7V4zm0 6h7v10h-7V10zm-9 3h7v7H4v-7z' },
  // 카드(비율·배경·모서리)는 템플릿을 고른 직후에 손대는 값이라 바로 아래에 둔다.
  { key: 'card', labelKey: 'photoCard.toolCard', path: 'M3 3h18v18H3V3zm2.2 2.2v13.6h13.6V5.2H5.2z' },
  { key: 'photo', labelKey: 'photoCard.toolPhoto', path: 'M20 4H4a1 1 0 00-1 1v14a1 1 0 001 1h16a1 1 0 001-1V5a1 1 0 00-1-1zm-1 13.9L14.4 12l-2.9 3.7-2.1-2.4L5 18V6h14v11.9zM9 10.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' },
  { key: 'text', labelKey: 'photoCard.toolText', path: 'M5 4h14v3.2h-5.4V20h-3.2V7.2H5V4z' },
  { key: 'element', labelKey: 'photoCard.toolElement', path: 'M3.5 3.5h8v8h-8v-8zm12.5 9a5 5 0 110 10 5 5 0 010-10z' },
  { key: 'data', labelKey: 'photoCard.toolData', path: 'M4 5h16v2.4H4V5zm0 5.8h16v2.4H4v-2.4zM4 16.6h10V19H4v-2.4z' },
  { key: 'layer', labelKey: 'photoCard.toolLayer', path: 'M12 2l10 5.6-10 5.6L2 7.6 12 2zm7.6 8.2L22 11.5l-10 5.6-10-5.6 2.4-1.3L12 14.4l7.6-4.2zm0 4.6L22 16l-10 5.6L2 16l2.4-1.2L12 19l7.6-4.2z' },
  { key: 'export', labelKey: 'photoCard.toolExport', path: 'M11 3h2v9.2l3.6-3.6 1.4 1.4L12 16 6 10l1.4-1.4L11 12.2V3zM4 18h16v2.4H4V18z', separated: true },
]
