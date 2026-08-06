import type { PhotoCardLayer, PhotoCardLayout, PhotoCardRatio } from '../types/photoCard.types'
import { PHOTO_CARD_SCHEMA_VERSION } from '../utils/layoutSchema'

/**
 * 서버 없이도 바로 쓸 수 있는 기본 레이아웃.
 *
 * 공식 템플릿은 DB(photo_card_templates)에 들어가지만, 목록이 비었거나 네트워크가 실패해도
 * 편집기가 빈 화면이 되면 안 된다. 관리자가 공식 템플릿을 넣기 전에도 기능이 동작해야 한다.
 * 같은 정의를 관리자 시드에도 쓴다.
 *
 * 모든 좌표·크기는 비율이다 — 크기 값은 프레임 **짧은 변** 기준.
 *
 * 글자는 가운데 기준으로만 그려진다(문단 정렬 속성이 없다). 그래서 x 는 전부 0.5 로 두고
 * 정보는 세로로 쌓는다 — 주류명·EXIF 의 길이가 제각각이어도 좌우 균형이 무너지지 않는다.
 * 줄 간격은 각 줄의 글자 높이보다 넉넉히 잡아야 겹치지 않는다(verify-photo-card.mjs 가 검사한다).
 */

const text = (
  id: string,
  binding: PhotoCardLayer['binding'],
  x: number,
  y: number,
  fontSizeRatio: number,
  overrides: Partial<PhotoCardLayer> = {},
): PhotoCardLayer => ({
  id,
  type: 'TEXT',
  position: { x, y },
  visible: true,
  binding,
  overridden: false,
  text: '',
  fontKey: 'pretendardBold',
  fontSizeRatio,
  color: '#111111',
  outlineEnabled: false,
  outlineColor: '#000000',
  outlineWidthRatio: 0,
  ...overrides,
})

const logo = (id: string, x: number, y: number, widthRatio = 0.09): PhotoCardLayer => ({
  id,
  type: 'IMAGE',
  position: { x, y },
  visible: true,
  source: 'PRODUCER_LOGO',
  uploadUrl: null,
  opacity: 1,
  widthRatio,
})

const divider = (id: string, x: number, y: number, widthRatio: number, fill = '#e5e5e5'): PhotoCardLayer => ({
  id,
  type: 'DIVIDER',
  position: { x, y },
  visible: true,
  widthRatio,
  thicknessRatio: 0.0022,
  fill,
})

export interface BuiltinLayout {
  key: string
  /** i18n 키 (photoCard.builtin*) */
  nameKey: string
  descriptionKey: string
  layout: PhotoCardLayout
}

const frame = (
  ratio: PhotoCardRatio,
  backgroundColor: string,
  padding: { top: number; right: number; bottom: number; left: number },
  photo: { fit: 'COVER' | 'CONTAIN'; radius: number; x: number; y: number; w: number; h: number },
  /** 카드 전체 모서리 — 기본 템플릿은 각지게 두고 사용자가 편집기에서 조절한다. */
  radius = 0,
) => ({ ratio, backgroundColor, radius, padding, photo })

/** ① 미니멀 — 사진을 가장자리까지 채우고 밴드는 얇게. 로고 없이 두 줄만. 편집기의 기본값이다. */
const minimal: PhotoCardLayout = {
  schemaVersion: PHOTO_CARD_SCHEMA_VERSION,
  frame: frame('4:5', '#ffffff',
    { top: 0, right: 0, bottom: 0.13, left: 0 },
    { fit: 'COVER', radius: 0, x: 0.5, y: 0.5, w: 1, h: 1 }),
  layers: [
    text('minimal-name', 'SPIRIT_NAME_KO', 0.5, 0.925, 0.036,
      { fontKey: 'pretendardBold', color: '#111111' }),
    text('minimal-exif', 'EXIF_APERTURE', 0.5, 0.965, 0.026,
      { fontKey: 'pretendardRegular', color: '#777777' }),
  ],
}

/** ② 세로 정렬 — 정보를 가운데에 세로로 쌓고, 구분선 아래에 EXIF 두 줄. 정보가 많을 때 유리하다. */
const stacked: PhotoCardLayout = {
  schemaVersion: PHOTO_CARD_SCHEMA_VERSION,
  frame: frame('4:5', '#ffffff',
    { top: 0.045, right: 0.045, bottom: 0.2, left: 0.045 },
    { fit: 'COVER', radius: 0.008, x: 0.5, y: 0.5, w: 1, h: 1 }),
  // 4:5 기준 사진 아래 경계는 y=0.84 다. 첫 줄이 글자 높이의 절반만큼 더 내려와야
  // 사진 위로 겹쳐 올라가지 않는다(verify-photo-card.mjs 가 이 침범을 검사한다).
  layers: [
    text('stacked-name', 'SPIRIT_NAME_KO', 0.5, 0.868, 0.044,
      { fontKey: 'gowunBatangBold', color: '#111111' }),
    text('stacked-producer', 'PRODUCER_NAME_KO', 0.5, 0.912, 0.026,
      { fontKey: 'gowunBatang', color: '#8a8a8a' }),
    divider('stacked-divider', 0.5, 0.936, 0.88),
    text('stacked-camera', 'EXIF_CAMERA', 0.5, 0.957, 0.023,
      { fontKey: 'pretendardRegular', color: '#666666' }),
    text('stacked-exif', 'EXIF_APERTURE', 0.5, 0.982, 0.023,
      { fontKey: 'pretendardMedium', color: '#666666' }),
  ],
}

/** ③ 클래식 하단 밴드 — 사진 아래 흰 밴드에 로고·주류명·생산자·EXIF 를 가운데로 쌓는다. */
const classic: PhotoCardLayout = {
  schemaVersion: PHOTO_CARD_SCHEMA_VERSION,
  // 좌우 두 칸이던 것을 한 줄씩 쌓으므로 밴드가 그만큼 높아야 한다(0.19 → 0.26).
  // 여백 값은 짧은 변 기준이라 4:5 에서 밴드는 208px(=0.26×800), 사진 아래 경계는 y=0.792 다.
  frame: frame('4:5', '#ffffff',
    { top: 0.045, right: 0.045, bottom: 0.26, left: 0.045 },
    { fit: 'COVER', radius: 0.008, x: 0.5, y: 0.5, w: 1, h: 1 }),
  layers: [
    // 로고는 맨 위 가운데. 오른쪽 구석에 두면 가운데로 모인 긴 주류명과 겹친다.
    // 크기는 너비 기준이고 높이는 그림 비율을 따르므로, 정사각 로고(가장 높은 경우)가
    // 들어와도 다음 줄과 붙지 않게 0.075(=60px)만큼 자리를 비워 두고 첫 줄을 잡았다.
    logo('classic-logo', 0.5, 0.828, 0.075),
    text('classic-name', 'SPIRIT_NAME_KO', 0.5, 0.885, 0.044,
      { fontKey: 'pretendardBlack', color: '#111111' }),
    text('classic-producer', 'PRODUCER_NAME_EN', 0.5, 0.92, 0.025,
      { fontKey: 'pretendardMedium', color: '#9a9a9a' }),
    text('classic-exif', 'EXIF_APERTURE', 0.5, 0.948, 0.026,
      { fontKey: 'pretendardMedium', color: '#555555' }),
    text('classic-camera', 'EXIF_CAMERA', 0.5, 0.976, 0.023,
      { fontKey: 'pretendardRegular', color: '#a3a3a3' }),
  ],
}

/** ④ 폴라로이드 — 사방 여백, 아래를 더 넓게. 손글씨 글꼴과 어울린다. */
const polaroid: PhotoCardLayout = {
  schemaVersion: PHOTO_CARD_SCHEMA_VERSION,
  frame: frame('4:5', '#fdfcf8',
    { top: 0.06, right: 0.06, bottom: 0.24, left: 0.06 },
    { fit: 'COVER', radius: 0.004, x: 0.5, y: 0.5, w: 1, h: 1 }),
  layers: [
    text('polaroid-name', 'SPIRIT_NAME_KO', 0.5, 0.86, 0.052,
      { fontKey: 'nanumPenScript', color: '#2b2b2b' }),
    text('polaroid-memo', 'USER_MEMO', 0.5, 0.915, 0.032,
      { fontKey: 'nanumPenScript', color: '#8a8a8a' }),
    text('polaroid-exif', 'EXIF_SHOT_AT', 0.5, 0.957, 0.024,
      { fontKey: 'pretendardRegular', color: '#b0b0b0' }),
  ],
}

/** ⑤ 다크 바 — 검은 배경에 밝은 글자. 바 조명 아래 찍은 어두운 사진과 톤이 맞는다. */
const darkBar: PhotoCardLayout = {
  schemaVersion: PHOTO_CARD_SCHEMA_VERSION,
  frame: frame('4:5', '#141414',
    { top: 0.045, right: 0.045, bottom: 0.17, left: 0.045 },
    { fit: 'COVER', radius: 0.008, x: 0.5, y: 0.5, w: 1, h: 1 }),
  layers: [
    text('dark-name', 'SPIRIT_NAME_KO', 0.5, 0.888, 0.046,
      { fontKey: 'blackHanSans', color: '#f5f5f5' }),
    text('dark-producer', 'PRODUCER_NAME_EN', 0.5, 0.924, 0.024,
      { fontKey: 'pretendardMedium', color: '#7a7a7a' }),
    text('dark-exif', 'EXIF_APERTURE', 0.5, 0.958, 0.026,
      { fontKey: 'pretendardMedium', color: '#bdbdbd' }),
  ],
}

/**
 * 목록 순서 = 사용자가 템플릿 탭에서 보는 순서.
 * DB 에 공식 템플릿을 시드할 때도 이 순서로 들어간다(AdminPhotoCardTemplatePage).
 */
export const BUILTIN_LAYOUTS: BuiltinLayout[] = [
  { key: 'minimal', nameKey: 'photoCard.builtinMinimal', descriptionKey: 'photoCard.builtinMinimalDesc', layout: minimal },
  { key: 'stacked', nameKey: 'photoCard.builtinStacked', descriptionKey: 'photoCard.builtinStackedDesc', layout: stacked },
  { key: 'classic', nameKey: 'photoCard.builtinClassic', descriptionKey: 'photoCard.builtinClassicDesc', layout: classic },
  { key: 'polaroid', nameKey: 'photoCard.builtinPolaroid', descriptionKey: 'photoCard.builtinPolaroidDesc', layout: polaroid },
  { key: 'darkBar', nameKey: 'photoCard.builtinDarkBar', descriptionKey: 'photoCard.builtinDarkBarDesc', layout: darkBar },
]

/**
 * 편집기를 처음 열었을 때의 레이아웃.
 *
 * 미니멀의 <b>틀만</b> 쓰고 요소는 비워 둔다. 템플릿의 자동 채움 텍스트(주류명·조리개)를 그대로 두면
 * 주류를 고르기 전에는 값이 비어 카드에 아무것도 안 보이는데 레이어 목록에만 두 줄이 남아,
 * 처음 들어온 사람에게는 "이게 왜 있지"가 된다. 템플릿을 직접 고르면 그때 요소가 들어온다.
 */
export const defaultPhotoCardLayout = (): PhotoCardLayout => ({
  ...JSON.parse(JSON.stringify(minimal)) as PhotoCardLayout,
  layers: [],
})
