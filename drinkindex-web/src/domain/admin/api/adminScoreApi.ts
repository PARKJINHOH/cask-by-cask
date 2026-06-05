import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { ScoreHistoryItem } from '@/domain/score/types/score.types'

// ── 점수 설정 ──────────────────────────────────────────────────

export interface ScoreConfigAdmin {
  id: number
  actionType: string
  score: number
  dailyLimit: number | null
  isActive: boolean
  description: string | null
  updatedAt: string
}

export interface CreateScoreConfigRequest {
  actionType: string
  score: number
  dailyLimit?: number | null
  isActive?: boolean
  description?: string
}

export interface UpdateScoreConfigRequest {
  actionType?: string
  score?: number
  dailyLimit?: number | null
  isActive?: boolean
  description?: string
}

// ── 레벨 설정 ──────────────────────────────────────────────────

export interface LevelConfigAdmin {
  id: number
  level: number
  name: string
  minScore: number
  isActive: boolean
  updatedAt: string
}

export interface CreateLevelConfigRequest {
  level: number
  name: string
  minScore: number
}

export interface UpdateLevelConfigRequest {
  name?: string
  minScore?: number
  isActive?: boolean
}

// ── 수동 점수 조정 ────────────────────────────────────────────

export interface AdminAdjustRequest {
  targetUserId: number
  amount: number
  description: string
}

export const adminScoreApi = {
  // 점수 설정
  getScoreConfigs: () =>
    axiosInstance.get<ApiResponse<ScoreConfigAdmin[]>>('/api/admin/score-config'),

  createScoreConfig: (data: CreateScoreConfigRequest) =>
    axiosInstance.post<ApiResponse<ScoreConfigAdmin>>('/api/admin/score-config', data),

  updateScoreConfig: (id: number, data: UpdateScoreConfigRequest) =>
    axiosInstance.patch<ApiResponse<ScoreConfigAdmin>>(`/api/admin/score-config/${id}`, data),

  deleteScoreConfig: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/score-config/${id}`),

  // 레벨 설정
  getLevelConfigs: () =>
    axiosInstance.get<ApiResponse<LevelConfigAdmin[]>>('/api/admin/level-config'),

  createLevelConfig: (data: CreateLevelConfigRequest) =>
    axiosInstance.post<ApiResponse<LevelConfigAdmin>>('/api/admin/level-config', data),

  updateLevelConfig: (id: number, data: UpdateLevelConfigRequest) =>
    axiosInstance.patch<ApiResponse<LevelConfigAdmin>>(`/api/admin/level-config/${id}`, data),

  deleteLevelConfig: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/level-config/${id}`),

  // 점수 이력 조회
  getScoreHistory: (userId: number, page = 0, size = 30) =>
    axiosInstance.get<ApiResponse<{ content: ScoreHistoryItem[]; totalPages: number; totalElements: number }>>(
      '/api/admin/score-history',
      { params: { userId, page, size } },
    ),

  // 수동 점수 조정
  adjustScore: (data: AdminAdjustRequest) =>
    axiosInstance.post<ApiResponse<null>>('/api/admin/score-adjust', data),
}
