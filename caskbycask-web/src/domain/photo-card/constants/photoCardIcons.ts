/**
 * 포토카드에 얹을 아이콘.
 *
 * 이모지를 쓰지 않는 이유: 기기·OS 마다 모양이 달라 같은 카드가 사람마다 다르게 보인다.
 * 24×24 뷰박스 SVG path 를 Path2D 로 캔버스에 직접 그린다 — 벡터라 원본 화질로 뽑아도 선명하고,
 * 색을 자유롭게 바꿀 수 있다.
 *
 * key 는 레이아웃 JSON 에 저장되므로 **바꾸면 기존 템플릿이 깨진다**.
 * 백엔드 PhotoCardTemplateService.ICON_KEYS 와 같은 목록을 유지해야 한다.
 */
export interface PhotoCardIcon {
  key: string
  labelKey: string
  /** 24×24 기준 path. fill 규칙은 evenodd 를 쓰지 않는다(구멍은 별도 path 로 분리). */
  path: string
}

export const PHOTO_CARD_ICONS: PhotoCardIcon[] = [
  {
    key: 'mapPin',
    labelKey: 'photoCard.iconMapPin',
    // 지도 마커 (구멍 포함)
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z',
  },
  {
    key: 'gps',
    labelKey: 'photoCard.iconGps',
    // 조준점 형태의 GPS 표시
    path: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A9.01 9.01 0 0 0 13 3.06V1h-2v2.06A9.01 9.01 0 0 0 3.06 11H1v2h2.06A9.01 9.01 0 0 0 11 20.94V23h2v-2.06A9.01 9.01 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  },
  {
    key: 'whisky',
    labelKey: 'photoCard.iconWhisky',
    // 위스키 잔(글렌캐런) — 잔 + 받침
    path: 'M7 2h10l-1.2 8.2A4 4 0 0 1 13 13.7V19h3v2H8v-2h3v-5.3a4 4 0 0 1-2.8-3.5L7 2zm2.3 2 .9 6a2 2 0 0 0 3.6 0l.9-6H9.3z',
  },
  {
    key: 'bottle',
    labelKey: 'photoCard.iconBottle',
    path: 'M10 2h4v3.2c0 .5.2 1 .6 1.4l1.1 1.1c.8.8 1.3 2 1.3 3.1V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9.2c0-1.1.5-2.3 1.3-3.1l1.1-1.1c.4-.4.6-.9.6-1.4V2zm-1 10v8h6v-8H9z',
  },
  {
    key: 'camera',
    labelKey: 'photoCard.iconCamera',
    path: 'M9 3l-1.5 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.5L15 3H9zm3 5.5A5.5 5.5 0 1 1 12 19.5a5.5 5.5 0 0 1 0-11zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  },
  {
    key: 'aperture',
    labelKey: 'photoCard.iconAperture',
    path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 0 1 6.32 3.1l-5.2 3-3.4-5.88A8 8 0 0 1 12 4zM7.6 5.4l3.4 5.9H4.3A8 8 0 0 1 7.6 5.4zM4.06 13.3H11l-3.47 6A8 8 0 0 1 4.06 13.3zm5.2 6.6l3.47-6 3.4 5.9a8 8 0 0 1-6.87.1zm8.6-1.3l-3.4-5.9h6.7a8 8 0 0 1-3.3 5.9zM13.6 11.3l3.47-6a8 8 0 0 1 3.4 6h-6.87z',
  },
  {
    key: 'calendar',
    labelKey: 'photoCard.iconCalendar',
    path: 'M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zM5 9h14v11H5V9z',
  },
  {
    key: 'star',
    labelKey: 'photoCard.iconStar',
    path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    key: 'heart',
    labelKey: 'photoCard.iconHeart',
    path: 'M12 21s-8-4.94-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 3.5C20 16.06 12 21 12 21z',
  },
  {
    key: 'barrel',
    labelKey: 'photoCard.iconBarrel',
    // 오크통
    path: 'M6 3h12l-1 3h2v2h-2.2c.13 1.3.2 2.63.2 4s-.07 2.7-.2 4H19v2h-2l1 3H6l1-3H5v-2h2.2A38 38 0 0 1 7 12c0-1.37.07-2.7.2-4H5V6h2L6 3zm3.3 3h5.4l.4-1H8.9l.4 1z',
  },
  {
    key: 'quote',
    labelKey: 'photoCard.iconQuote',
    path: 'M7.2 6C4.9 6 3 7.9 3 10.2c0 2.3 1.9 4.2 4.2 4.2.4 0 .8-.06 1.1-.16-.5 1.9-2 3.3-3.9 3.76V21c4-.7 7-4.2 7-8.5V10.2C11.4 7.9 9.5 6 7.2 6zm11 0C15.9 6 14 7.9 14 10.2c0 2.3 1.9 4.2 4.2 4.2.4 0 .8-.06 1.1-.16-.5 1.9-2 3.3-3.9 3.76V21c4-.7 7-4.2 7-8.5V10.2C22.4 7.9 20.5 6 18.2 6z',
  },
  {
    key: 'divider',
    labelKey: 'photoCard.iconDot',
    // 가운뎃점 3개 — 텍스트 사이 구분에 쓴다
    path: 'M5 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  },
]

export const PHOTO_CARD_ICON_KEYS = PHOTO_CARD_ICONS.map((icon) => icon.key)

export const getPhotoCardIcon = (key: string | undefined): PhotoCardIcon | null =>
  PHOTO_CARD_ICONS.find((icon) => icon.key === key) ?? null
