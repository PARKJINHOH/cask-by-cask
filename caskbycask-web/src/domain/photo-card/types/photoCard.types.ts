// 백엔드 `domain/photocard/dto/PhotoCardLayout.java` 와 1:1 로 유지한다.
// 한쪽만 바꾸면 저장은 되는데 화면이 깨지거나, 저장 단계에서 400 이 난다.

/** 프레임 비율. 백엔드 PhotoCardTemplateService.RATIOS 와 같아야 한다. */
export type PhotoCardRatio = '1:1' | '4:5' | '3:4' | '9:16' | '16:9'

export type PhotoCardLayerType = 'TEXT' | 'IMAGE' | 'DIVIDER' | 'BOX' | 'ICON'

export type PhotoCardPhotoFit = 'COVER' | 'CONTAIN'

export type PhotoCardImageSource = 'PRODUCER_LOGO' | 'SPIRIT_IMAGE' | 'UPLOAD'

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
  | 'PRODUCER_NAME_KO'
  | 'PRODUCER_NAME_EN'
  | 'PRODUCER_COUNTRY'
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

  // ── ICON ─────────────────────────────
  /** photoCardIcons.ts 의 key */
  iconKey?: string

  // ── IMAGE ────────────────────────────
  source?: PhotoCardImageSource
  uploadUrl?: string | null
  opacity?: number

  // ── IMAGE / DIVIDER / BOX ────────────
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
  user: PhotoCardUserInput
}
