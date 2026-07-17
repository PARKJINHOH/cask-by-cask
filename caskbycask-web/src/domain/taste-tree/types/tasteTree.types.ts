export type TasteTreeType = 'OFFICIAL' | 'USER'
export type TasteTreeVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type TasteTreeModerationStatus = 'VISIBLE' | 'HIDDEN'
export type TasteTreeSort = 'LATEST' | 'LIKES' | 'VIEWS'
export type TasteTreeNodeType = 'START' | 'CHOICE' | 'INFO' | 'WHISKY'
export type TasteTreeWhiskySource = 'REGISTERED' | 'CUSTOM'

export interface TasteTreeWhisky {
  source: TasteTreeWhiskySource
  spiritId?: number | null
  nameKo?: string | null
  nameEn?: string | null
  imageUrl?: string | null
  imageOverrideUrl?: string | null
  priceAmount?: number | null
  currencyCode?: string | null
  priceText?: string | null
  noteKo?: string | null
  noteEn?: string | null
}

export interface TasteTreeNode {
  key: string
  type: TasteTreeNodeType
  titleKo: string
  titleEn?: string | null
  descriptionKo?: string | null
  descriptionEn?: string | null
  positionX: number
  positionY: number
  width?: number | null
  height?: number | null
  imageUrl?: string | null
  imageFit?: 'CONTAIN' | 'COVER' | null
  imagePositionX?: number | null
  imagePositionY?: number | null
  imageScale?: number | null
  imageHidden?: boolean | null
  whisky?: TasteTreeWhisky | null
}

export interface TasteTreeEdge {
  key: string
  sourceNodeKey: string
  targetNodeKey: string
  labelKo: string
  labelEn?: string | null
  descriptionKo?: string | null
  descriptionEn?: string | null
  sortOrder: number
  sourceHandle?: string | null
  targetHandle?: string | null
  labelPosition?: number | null
  lineType?: 'STRAIGHT' | 'STEP' | null
}

export interface TasteTreeContent {
  schemaVersion: number
  nodes: TasteTreeNode[]
  edges: TasteTreeEdge[]
}

export interface TasteTreeSummary {
  id: number
  type: TasteTreeType
  shareKey: string
  ownerNickname: string | null
  title: string
  description: string | null
  publishedVersion: number | null
  bookmarked: boolean
  likedByMe: boolean
  canLike: boolean
  likeCount: number
  viewCount: number
  moderationStatus: TasteTreeModerationStatus
  hasDraft: boolean
  updatedAt: string
}

export interface TasteTreeView {
  id: number
  type: TasteTreeType
  shareKey: string
  ownerNickname: string | null
  owner: boolean
  bookmarked: boolean
  likedByMe: boolean
  canLike: boolean
  likeCount: number
  viewCount: number
  moderationStatus: TasteTreeModerationStatus
  versionId: number
  versionNumber: number
  versionStatus: TasteTreeVersionStatus
  title: string
  description: string | null
  content: TasteTreeContent
  hasDraft: boolean
  createdAt: string
  updatedAt: string
}

export interface TasteTreeSavePayload {
  title: string
  description?: string | null
  content: TasteTreeContent
}

export interface TasteTreeEngagement {
  liked: boolean
  likeCount: number
  viewCount: number
}

export interface TasteTreePage {
  content: TasteTreeSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
  empty: boolean
}

export interface MyTasteTrees {
  created: TasteTreeSummary[]
  saved: TasteTreeSummary[]
}

export interface TasteTreeImageUpload {
  id: number
  imageUrl: string
  savedFileName: string
  mimeType: string
}
