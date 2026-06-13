import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'

// ── 발송 ─────────────────────────────────────────────────────────

export interface SendEmailRequest {
  subject: string
  body: string
  testEmail?: string
}

export interface SendEmailResult {
  successCount: number
  failCount: number
  isTest: boolean
}

// ── 이력 ─────────────────────────────────────────────────────────

export type EmailSendType = 'TEST' | 'BULK'

export interface EmailSendLog {
  id: number
  sendType: EmailSendType
  subject: string
  totalCount: number
  successCount: number
  failCount: number
  sentAt: string
}

export interface EmailSendRecipient {
  email: string
  nickname: string | null
  success: boolean
  errorMessage: string | null
}

export interface EmailSendLogDetail extends EmailSendLog {
  body: string
  recipients: EmailSendRecipient[]
}

// ── 템플릿 ───────────────────────────────────────────────────────

export interface EmailTemplate {
  id: number
  name: string
  subject: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface EmailTemplateRequest {
  name: string
  subject: string
  body: string
}

// ── API ──────────────────────────────────────────────────────────

export const adminEmailApi = {
  // 발송
  getSubscriberCount: () =>
    axiosInstance.get<ApiResponse<number>>('/api/admin/emails/subscribers/count'),

  sendTest: (data: SendEmailRequest) =>
    axiosInstance.post<ApiResponse<SendEmailResult>>('/api/admin/emails/test', data),

  sendBulk: (data: SendEmailRequest) =>
    axiosInstance.post<ApiResponse<SendEmailResult>>('/api/admin/emails/send', data),

  // 이력
  getLogs: (params: { page: number; size: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<EmailSendLog>>>('/api/admin/emails/logs', { params }),

  getLogDetail: (id: number) =>
    axiosInstance.get<ApiResponse<EmailSendLogDetail>>(`/api/admin/emails/logs/${id}`),

  // 템플릿
  getTemplates: () =>
    axiosInstance.get<ApiResponse<EmailTemplate[]>>('/api/admin/emails/templates'),

  createTemplate: (data: EmailTemplateRequest) =>
    axiosInstance.post<ApiResponse<EmailTemplate>>('/api/admin/emails/templates', data),

  updateTemplate: (id: number, data: EmailTemplateRequest) =>
    axiosInstance.put<ApiResponse<EmailTemplate>>(`/api/admin/emails/templates/${id}`, data),

  deleteTemplate: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/emails/templates/${id}`),
}
