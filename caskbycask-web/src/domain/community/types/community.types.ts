export type BoardType = 'NOTICE' | 'FREE'
export type PostSort = 'LATEST' | 'BEST' | 'VIEW'

export interface PostPrefix {
  id: number
  name: string
  colorHex: string | null
}

export interface PostListItem {
  id: number
  boardType: BoardType
  prefix: PostPrefix | null
  title: string
  isLocked: boolean
  isPinned: boolean     // 게시판 공지(고정글)
  adultOnly: boolean    // 성인 전용(주류 나눔 등) — 제목 19 아이콘
  authorNickname: string
  authorId?: number | null
  authorRole?: string   // null if anonymous
  authorLevel?: number  // null if anonymous
  authorMaturingPower?: number | null
  authorNicknameFixed?: boolean | null
  authorProfileImageUrl?: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  hasPoll: boolean
  createdAt: string
}

export interface PollOptionInfo {
  id: number
  optionText: string
  voteCount: number
  sortOrder: number
}

export interface PollDetail {
  id: number
  question: string
  isMultipleChoice: boolean
  endsAt: string | null
  isExpired: boolean
  options: PollOptionInfo[]
  totalVotes: number
}

export interface PollResponse extends PollDetail {
  myVotedOptionIds: number[] | null
}

export interface PostImageInfo {
  id: number
  imageUrl: string
  originalFileName: string
}

export interface SeriesInfo {
  id: number
  title: string
  seriesOrder: number | null
  postCount: number
}

export interface PostDetail {
  id: number
  boardType: BoardType
  prefix: PostPrefix | null
  title: string
  isLocked: boolean
  isHidden: boolean     // 관리자/모더레이터 숨김 처리
  isPinned: boolean     // 게시판 공지(고정글)
  adultOnly: boolean    // 성인 전용(주류 나눔 등) — 제목 19 아이콘
  contentSanitized: string | null
  authorNickname: string
  authorId: number | null
  authorRole?: string   // null if anonymous
  authorLevel?: number  // null if anonymous
  authorMaturingPower?: number | null
  authorNicknameFixed?: boolean | null
  authorProfileImageUrl?: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  poll: PollDetail | null
  images: PostImageInfo[]
  series: SeriesInfo | null
  isMyPost: boolean | null
  isLiked: boolean | null
  isScrapped: boolean | null
  isBlocked: boolean | null
  createdAt: string
  updatedAt: string
}

export interface SeriesItem {
  id: number
  title: string
  description: string | null
  authorNickname: string
  postCount: number
  createdAt: string
}

export interface SeriesPostItem {
  id: number
  title: string
  seriesOrder: number | null
  likeCount: number
  commentCount: number
  createdAt: string
}

export interface SeriesDetail {
  id: number
  boardType: BoardType
  title: string
  description: string | null
  authorNickname: string
  postCount: number
  posts: SeriesPostItem[]
  createdAt: string
}

// ── 댓글 ─────────────────────────────────────────────────────

export interface EmojiReactionSummary {
  emojiId: number
  unicode: string | null
  imageUrl: string | null
  count: number
  isMyReaction: boolean
}

export interface PostCommentItem {
  id: number
  authorNickname: string | null
  authorId?: number | null
  authorRole?: string   // null if anonymous or deleted
  authorLevel?: number  // null if anonymous or deleted
  authorMaturingPower?: number | null
  authorNicknameFixed?: boolean | null
  authorProfileImageUrl?: string | null
  content: string
  mentionedUserNickname: string | null
  emojiReactions: EmojiReactionSummary[]
  children: PostCommentItem[]
  createdAt: string
  isMyComment: boolean
  isDeleted: boolean
  isHidden: boolean // 신고/관리자에 의해 숨김 처리됨
  isSecret: boolean
  isSecretMasked: boolean // 비밀댓글이지만 열람 권한이 없어 마스킹됨
}

export interface CommunityEmoji {
  id: number
  groupId: number | null
  groupName: string | null
  unicode: string | null
  imageUrl: string | null
  label: string
  sortOrder: number
}

export interface UserMention {
  id: number
  nickname: string
}

// ── 글쓰기 페이로드 ──────────────────────────────────────────

export interface PollOptionPayload {
  optionText: string
  sortOrder: number
}

export interface PollPayload {
  question: string
  isMultipleChoice?: boolean
  endsAt?: string | null
  options: PollOptionPayload[]
}

export interface CreatePostPayload {
  boardType: BoardType
  prefixId?: number
  title: string
  content: string
  isAnonymous?: boolean
  isPinned?: boolean
  adultOnly?: boolean
  poll?: PollPayload
  seriesId?: number
}

export interface UpdatePostPayload {
  prefixId?: number | null
  title?: string
  content?: string
  isPinned?: boolean
  adultOnly?: boolean
}
