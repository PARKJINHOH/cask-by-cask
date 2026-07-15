export type TasteTreeType = 'OFFICIAL' | 'USER'
export type TasteTreeVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type TasteTreeNodeType = 'START' | 'QUESTION' | 'INFO' | 'RESULT'
export type TasteTreeSelectionType = 'SINGLE' | 'MULTIPLE'
export type TasteTreeResultItemType = 'REGISTERED' | 'CUSTOM'

export interface TasteTreeOption {
  key: string
  labelKo: string
  labelEn?: string | null
  descriptionKo?: string | null
  descriptionEn?: string | null
  targetNodeKey: string
  attributeCodes?: string[] | null
}

export interface TasteTreeResultDefinition {
  type: TasteTreeResultItemType
  spiritId?: number | null
  displayNameKo?: string | null
  displayNameEn?: string | null
  imageUrl?: string | null
  customName?: string | null
  customImageUrl?: string | null
  priceAmount?: number | null
  currencyCode?: string | null
  recommendationReasonKo?: string | null
  recommendationReasonEn?: string | null
}

export interface TasteTreeDynamicFilter {
  styles?: string[] | null
  peated?: boolean | null
  caskToken?: string | null
  bottlingType?: string | null
  caskStrength?: boolean | null
  singleCask?: boolean | null
  resultTitleKo?: string | null
  resultTitleEn?: string | null
  recommendationReasonKo?: string | null
  recommendationReasonEn?: string | null
}

export interface TasteTreeNode {
  key: string
  type: TasteTreeNodeType
  titleKo: string
  titleEn?: string | null
  descriptionKo?: string | null
  descriptionEn?: string | null
  positionX?: number | null
  positionY?: number | null
  selectionType?: TasteTreeSelectionType | null
  minSelect?: number | null
  maxSelect?: number | null
  options?: TasteTreeOption[] | null
  results?: TasteTreeResultDefinition[] | null
  dynamicFilter?: TasteTreeDynamicFilter | null
}

export interface TasteTreeContent {
  experienceLevel?: string | null
  nodes: TasteTreeNode[]
}

export interface TasteTreeSummary {
  id: number
  type: TasteTreeType
  shareKey: string
  ownerNickname: string | null
  title: string
  description: string | null
  experienceLevel: string | null
  publishedVersion: number | null
  bookmarked: boolean
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

export interface TasteTreePathSnapshot {
  nodeKey: string
  titleKo: string
  titleEn: string | null
  selectedLabelsKo: string[]
  selectedLabelsEn: string[]
}

export interface TasteTreeResultItem {
  type: TasteTreeResultItemType
  spiritId: number | null
  nameKo: string
  nameEn: string
  imageUrl: string | null
  canonicalPathKo: string | null
  canonicalPathEn: string | null
  priceAmount: number | null
  currencyCode: string | null
  matchScore: number
  recommendationReasonKo: string | null
  recommendationReasonEn: string | null
}

export interface TasteTreeResult {
  id: number
  shareKey: string
  treeId: number
  treeShareKey: string
  treeType: TasteTreeType
  treeTitle: string
  treeDescription: string | null
  resultTitleKo: string
  resultTitleEn: string
  ownerNickname: string | null
  versionId: number
  versionNumber: number
  latestVersion: boolean
  content: TasteTreeContent
  path: TasteTreePathSnapshot[]
  items: TasteTreeResultItem[]
  createdAt: string
}

export interface TasteTreeAnswer {
  nodeKey: string
  optionKeys: string[]
}

export interface TasteTreeSavePayload {
  title: string
  description?: string | null
  content: TasteTreeContent
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
