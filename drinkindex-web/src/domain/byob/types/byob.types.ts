export type ByobStatus = 'OPEN' | 'CLOSED' | 'CANCELLED'
export type ParticipantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED'

export interface ByobListItem {
  id: number
  title: string
  hostNickname: string
  hostLevel: number
  hostProfileImageUrl: string | null
  location: string
  eventAt: string
  recruitStartAt: string
  recruitEndAt: string
  maxParticipants: number
  approvedCount: number
  status: ByobStatus
  linkedFreePostId: number | null
  createdAt: string
}

export interface ByobDetail {
  id: number
  hostUserId: number
  hostNickname: string
  hostLevel: number
  hostProfileImageUrl: string | null
  title: string
  content: string
  location: string
  address: string
  eventAt: string
  recruitStartAt: string
  recruitEndAt: string
  hostBottles: string[]
  maxParticipants: number
  approvedCount: number
  pendingCount: number
  status: ByobStatus
  linkedFreePostId: number | null
  myParticipant: ByobParticipant | null
  createdAt: string
  updatedAt: string
}

export interface ByobParticipant {
  id: number
  userId: number
  nickname: string
  userLevel: number
  userProfileImageUrl: string | null
  bottleNames: string[]
  memo: string | null
  status: ParticipantStatus
  removedReason: string | null
  appliedAt: string
}

export interface ByobComment {
  id: number
  byobId: number
  participantUserId: number
  participantNickname: string
  authorUserId: number
  authorNickname: string
  content: string
  createdAt: string
  parentId: number | null
  replies: ByobComment[]
}

export interface CreateByobPayload {
  title: string
  content: string
  location: string
  address: string
  eventAt: string
  recruitStartAt: string
  recruitEndAt: string
  maxParticipants: number
  hostBottles: string[]
  exposeToFreeBoard: boolean
}

export interface UpdateByobPayload {
  title: string
  content: string
  location: string
  address: string
  eventAt: string
  recruitStartAt: string
  recruitEndAt: string
  maxParticipants: number
  hostBottles: string[]
}

export interface ApplyByobPayload {
  bottleNames: string[]
  memo?: string
}

export interface RemoveParticipantPayload {
  removedReason: string
}

export interface ByobStatusUpdatePayload {
  status: ByobStatus
}

export interface ByobMyHosted {
  id: number
  title: string
  status: ByobStatus
  approvedCount: number
  maxParticipants: number
  eventAt: string
  recruitEndAt: string
  createdAt: string
}

export interface ByobMyJoined {
  id: number
  title: string
  hostNickname: string
  status: ByobStatus
  myStatus: ParticipantStatus
  bottleNames: string[]
  appliedAt: string
}
