export type BoardType = 'NOTICE' | 'FREE'
export type PostSort = 'LATEST' | 'BEST' | 'VIEW'
export type PostPeriod = 'TODAY' | 'WEEK' | 'ALL'

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
  authorNickname: string
  viewCount: number
  likeCount: number
  dislikeCount: number
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
  contentSanitized: string | null
  authorNickname: string
  authorId: number | null
  viewCount: number
  likeCount: number
  dislikeCount: number
  commentCount: number
  poll: PollDetail | null
  images: PostImageInfo[]
  series: SeriesInfo | null
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
