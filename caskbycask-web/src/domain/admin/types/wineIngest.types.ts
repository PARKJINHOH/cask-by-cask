export type WineIngestProviderMode = 'FIXTURE' | 'LIVE'
export type WineIngestRunType = 'FIXTURE' | 'MANUAL' | 'SCHEDULED'
export type WineIngestRunStatus = 'CANCELLED' | 'FAILED' | 'PARTIAL' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED'
export type WineIngestItemStatus = 'CREATED' | 'DUPLICATE_SKIPPED' | 'FAILED' | 'NOT_FOUND_SKIPPED'

export interface WineIngestSettings {
  automationEnabled: boolean
  providerMode: WineIngestProviderMode
  licenseApproved: boolean
  usageGrantRef: string | null
  hourlyLimit: number
  maxRunItems: number
  slackAlertEnabled: boolean
  liveNetworkEnabled: boolean
  updatedAt: string
}

export interface WineIngestRun {
  id: number
  runKey: string
  runType: WineIngestRunType
  status: WineIngestRunStatus
  requestedLimit: number
  attemptedCount: number
  createdCount: number
  duplicateCount: number
  skippedCount: number
  failedCount: number
  errorMessage: string | null
  startedAt: string | null
  lastHeartbeatAt: string | null
  finishedAt: string | null
  createdAt: string
}

export interface WineIngestItem {
  id: number
  runId: number
  status: WineIngestItemStatus
  provider: string
  externalWineId: string | null
  externalVintageId: string | null
  sourceUrl: string | null
  wineNameEn: string | null
  wineNameKo: string | null
  vintageLabel: string | null
  reasonCode: string | null
  reasonMessage: string | null
  spiritId: number | null
  masterSpiritId: number | null
  koreanNameReady: boolean
  published: boolean
  createdAt: string
}

export interface WineIngestDashboard {
  settings: WineIngestSettings
  queuedCount: number
  runningCount: number
  latestRun: WineIngestRun | null
}
