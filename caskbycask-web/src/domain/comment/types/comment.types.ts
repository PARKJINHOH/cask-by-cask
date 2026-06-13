export interface CommentItem {
  id: number
  userId: number
  nickname: string
  content: string
  likeCount: number
  createdAt: string
  children: CommentItem[]
}

export interface CreateCommentRequest {
  content: string
  parentId?: number
}

export interface UpdateCommentRequest {
  content: string
}
