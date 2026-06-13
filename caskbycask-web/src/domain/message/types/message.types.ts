export type MessageBox = 'INBOX' | 'SENT' | 'ALL'

export interface MessageSummary {
  id: number
  partnerNickname: string
  lastMessage: string
  hasUnread: boolean
  createdAt: string
}

export interface MessageItemDetail {
  id: number
  senderNickname: string
  content: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface MessageThread {
  id: number
  senderNickname: string
  receiverNickname: string
  items: MessageItemDetail[]
  createdAt: string
}
