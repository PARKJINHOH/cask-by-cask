// 백엔드 `domain/photocard/dto/PhotoCardLayout.java` 와 1:1 로 유지한다.
// 한쪽만 바꾸면 저장은 되는데 화면이 깨지거나, 저장 단계에서 400 이 난다.

/** 카드 도구에 프리셋 단추로 놓이는 비율. */
export type PhotoCardRatioPreset = '1:1' | '4:5' | '3:4' | '9:16' | '16:9'

/**
 * 프레임 비율 — `가로:세로` 꼴의 문자열.
 *
 * 프리셋 말고 사진에 맞춘 값(예: `3:2`)이나 직접 적은 값도 들어온다.
 * 형식·범위는 백엔드 PhotoCardTemplateService.RATIO_PATTERN 과 같아야 한다.
 * `string & {}` 를 함께 두는 것은 임의의 문자열을 받으면서도 프리셋 자동완성을 남기기 위해서다.
 */
export type PhotoCardRatio = PhotoCardRatioPreset | (string & {})

export type PhotoCardLayerType = 'TEXT' | 'IMAGE' | 'DIVIDER' | 'BOX' | 'ICON'

export type PhotoCardPhotoFit = 'COVER' | 'CONTAIN'
export type PhotoCardTextAlign = 'LEFT' | 'CENTER' | 'RIGHT'
export type PhotoCardBackgroundTexture = 'NONE' | 'PAPER'

export type PhotoCardImageSource =
  | 'PRODUCER_LOGO'
  | 'SPIRIT_IMAGE'
  | 'UPLOAD'
  | 'REVIEW_AROMA_NOSE'
  | 'REVIEW_AROMA_TASTE'
  | 'REVIEW_AROMA_FINISH'

/**
 * 텍스트 레이어에 자동으로 채울 값의 출처.
 * 백엔드 `PhotoCardBinding` enum 과 같아야 한다.
 *
 * EXIF_GPS 는 자동으로 채워지지 않는다 — 좌표는 집·직장을 드러낼 수 있어
 * 사용자가 EXIF 목록에서 직접 ＋ 를 눌렀을 때만 레이어가 만들어진다.
 */
export type PhotoCardBinding =
  | 'NONE'
  | 'EXIF_CAMERA'
  | 'EXIF_LENS'
  | 'EXIF_APERTURE'
  | 'EXIF_SHUTTER'
  | 'EXIF_ISO'
  | 'EXIF_FOCAL_LENGTH'
  | 'EXIF_FOCAL_LENGTH_35'
  | 'EXIF_SHOT_AT'
  | 'EXIF_GPS'
  | 'SPIRIT_NAME_KO'
  | 'SPIRIT_NAME_EN'
  | 'SPIRIT_ABV'
  | 'SPIRIT_VOLUME'
  | 'SPIRIT_VINTAGE'
  | 'SPIRIT_CATEGORY'
  | 'SPIRIT_REGION'
  | 'SPIRIT_DETAIL'
  | 'PRODUCER_NAME_KO'
  | 'PRODUCER_NAME_EN'
  | 'PRODUCER_COUNTRY'
  | 'REVIEW_TOTAL_SCORE'
  | 'REVIEW_NOSE_SCORE'
  | 'REVIEW_TASTE_SCORE'
  | 'REVIEW_FINISH_SCORE'
  | 'REVIEW_NOSE_NOTE'
  | 'REVIEW_TASTE_NOTE'
  | 'REVIEW_FINISH_NOTE'
  | 'REVIEW_OVERALL'
  | 'REVIEW_AROMA_NOSE'
  | 'REVIEW_AROMA_TASTE'
  | 'REVIEW_AROMA_FINISH'
  | 'REVIEW_ATTRIBUTION'
  | 'USER_PLACE'
  | 'USER_MEMO'
  | 'USER_DATE'

/** 프레임 대비 정규화 좌표(0~1). 요소의 중심을 가리킨다. */
export interface PhotoCardPosition {
  x: number
  y: number
}

export interface PhotoCardPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PhotoCardPhoto {
  fit: PhotoCardPhotoFit
  radius: number
  /** 사진 영역 중심·크기 — 프레임 대비 비율 */
  x: number
  y: number
  w: number
  h: number
}

export interface PhotoCardFrame {
  ratio: PhotoCardRatio
  backgroundColor: string
  /** 출력에도 동일하게 적용되는 카드 배경 질감 */
  backgroundTexture?: PhotoCardBackgroundTexture
  /** 카드 전체 모서리 둥글기 — 짧은 변 대비 비율. PNG 로 뽑으면 잘린 모서리가 투명해진다. */
  radius: number
  padding: PhotoCardPadding
  /**
   * 카드 확장 — 비율 프리셋으로 정해지는 <b>기준 프레임</b> 바깥으로 각 변을 넓힌다.
   * 단위는 기준 프레임 짧은 변 대비 비율(padding 과 같은 기준)이다.
   *
   * padding 과 역할이 다르다 — padding 은 카드 크기를 그대로 두고 <b>사진을 줄여</b> 여백을 만들고,
   * extend 는 사진·글자를 그대로 둔 채 <b>카드를 키워</b> 배경을 덧댄다.
   * 값이 전부 0 이면 필드 자체를 남기지 않는다(기존 템플릿 JSON 이 커지지 않게).
   */
  extend?: PhotoCardPadding
  photo: PhotoCardPhoto
}

/**
 * 레이어. 타입별로 인터페이스를 나누지 않고 하나로 둔다 — 백엔드 record 와 왕복시키기 위해서다.
 * 타입에 해당하지 않는 필드는 undefined 다.
 *
 * ★ 크기는 전부 **프레임 짧은 변 대비 비율**이다. 원본 사진 해상도와 무관하게 같은 결과가 나온다.
 */
export interface PhotoCardLayer {
  id: string
  type: PhotoCardLayerType
  position: PhotoCardPosition
  rotation?: number
  visible?: boolean

  // ── TEXT ─────────────────────────────
  binding?: PhotoCardBinding
  /** 자동으로 채워진 값을 사용자가 고쳤는가 — true 면 text 를 그대로 쓴다 */
  overridden?: boolean
  text?: string
  fontKey?: string
  fontSizeRatio?: number
  color?: string
  outlineEnabled?: boolean
  outlineColor?: string
  outlineWidthRatio?: number
  letterSpacing?: number
  lineHeight?: number
  textAlign?: PhotoCardTextAlign

  // ── ICON ─────────────────────────────
  /** photoCardIcons.ts 의 key */
  iconKey?: string

  // ── IMAGE ────────────────────────────
  source?: PhotoCardImageSource
  uploadUrl?: string | null
  opacity?: number

  // ── TEXT / IMAGE / DIVIDER / BOX ─────
  /** TEXT 에서는 자동 줄바꿈할 최대 폭, 나머지 타입에서는 요소 자체의 폭 */
  widthRatio?: number
  heightRatio?: number
  thicknessRatio?: number
  radius?: number
  fill?: string
  strokeColor?: string | null
  strokeWidthRatio?: number
}

export interface PhotoCardLayout {
  schemaVersion: number
  frame: PhotoCardFrame
  layers: PhotoCardLayer[]
}

// ── 템플릿 ────────────────────────────────────────────────

export type PhotoCardTemplateType = 'OFFICIAL' | 'USER'
export type PhotoCardModerationStatus = 'VISIBLE' | 'HIDDEN'
export type PhotoCardTemplateScope = 'OFFICIAL' | 'MINE' | 'PUBLIC'

export interface PhotoCardTemplate {
  id: number
  templateType: PhotoCardTemplateType
  name: string
  description: string | null
  aspectRatio: PhotoCardRatio
  schemaVersion: number
  layout: PhotoCardLayout
  thumbnailUrl: string | null
  isPublic: boolean
  moderationStatus: PhotoCardModerationStatus
  displayOrder: number
  useCount: number
  ownerId: number | null
  ownerNickname: string | null
  isMine: boolean
  createdAt: string
  updatedAt: string
}

export interface PhotoCardTemplateSaveRequest {
  name: string
  description?: string | null
  layout: PhotoCardLayout
  thumbnailUrl?: string | null
  thumbnailSavedFileName?: string | null
  thumbnailSubPath?: string | null
  isPublic?: boolean
}

export interface PhotoCardImageUploadResponse {
  imageUrl: string
  savedFileName: string
  subPath: string
}

// ── 편집 중 데이터 (저장되지 않는 런타임 상태) ──────────────

/** 사진에서 읽은 촬영 정보. */
export interface PhotoExif {
  cameraMake: string | null
  cameraModel: string | null
  lensModel: string | null
  aperture: number | null
  shutterSpeed: number | null
  iso: number | null
  focalLength: number | null
  /** 35mm 환산 초점거리 — 휴대폰은 실제값(6.5mm)보다 이쪽이 사진 이야기에 맞는다. */
  focalLength35: number | null
  /** 촬영 위치. 카드에 넣는 것은 사용자가 ＋ 를 눌렀을 때만이다. */
  latitude: number | null
  longitude: number | null
  shotAt: Date | null
}

/** 포토카드에 얹을 주류 정보. 검색으로 채우고 사용자가 고칠 수 있다. */
export interface PhotoCardSpiritInfo {
  spiritId: number | null
  nameKo: string
  nameEn: string
  category: string | null
  abv: string
  volumeMl: string
  vintageYear: string
  producerNameKo: string
  producerNameEn: string
  producerCountry: string
  producerLogoUrl: string | null
  spiritImageUrl: string | null
  region?: string
  detail?: string
}

/** 리뷰 공유 템플릿이 다른 리뷰에서도 같은 자리에 새 값을 채우기 위한 데이터. */
export interface PhotoCardReviewInfo {
  totalScore: string
  noseScore: string
  tasteScore: string
  finishScore: string
  noseNote: string
  tasteNote: string
  finishNote: string
  overall: string
  aromaNose: string
  aromaTaste: string
  aromaFinish: string
  /**
   * 편집기에서는 수치를 다시 편집하지 않고 이 값으로 레이더 이미지 레이어만 생성한다.
   * 레이아웃에는 phase별 이미지 출처만 저장되므로 템플릿을 다른 리뷰에 적용하면 새 값으로 다시 그려진다.
   */
  aromaProfiles?: PhotoCardAromaProfile[]
  attribution: string
}

export type PhotoCardAromaPhase = 'NOSE' | 'PALATE' | 'FINISH'

export interface PhotoCardAromaProfile {
  phase: PhotoCardAromaPhase
  title: string
  items: Array<{
    label: string
    intensity: number
  }>
}

/** 사용자가 직접 적는 값 */
export interface PhotoCardUserInput {
  place: string
  memo: string
  date: string
}

/** 바인딩을 실제 문자열로 바꿀 때 참조하는 데이터 묶음 */
export interface PhotoCardDataContext {
  exif: PhotoExif | null
  spirit: PhotoCardSpiritInfo | null
  review: PhotoCardReviewInfo | null
  user: PhotoCardUserInput
}
