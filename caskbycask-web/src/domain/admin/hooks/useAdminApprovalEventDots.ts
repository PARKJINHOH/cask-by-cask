import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminDashboardApi, type AdminApprovalEventSnapshot } from '../api/adminDashboardApi'

const STORAGE_KEY_PREFIX = 'admin-approval-event-seen:v1'
const APPROVAL_EVENT_SNAPSHOT_KEY = ['admin', 'approval-event-snapshots'] as const

export const APPROVAL_EVENT_MENU_PATHS = [
  '/admin/events',
  '/admin/spirits/requests',
  '/admin/spirits/variant-requests',
  '/admin/producers/requests',
  '/admin/price-reports',
  '/admin/stores',
] as const

type ApprovalEventMenuPath = (typeof APPROVAL_EVENT_MENU_PATHS)[number]

interface SeenMarker {
  latestCreatedAt: string | null
  latestEventKey: string | null
}

type SeenMarkers = Partial<Record<ApprovalEventMenuPath, SeenMarker>>

interface UseAdminApprovalEventDotsParams {
  enabled: boolean
  pathname: string
  userId?: number
}

function storageKeyFor(userId?: number) {
  return userId == null ? null : `${STORAGE_KEY_PREFIX}:${userId}`
}

function isApprovalEventMenuPath(path: string): path is ApprovalEventMenuPath {
  return APPROVAL_EVENT_MENU_PATHS.includes(path as ApprovalEventMenuPath)
}

function matchesMenuPath(pathname: string, menuPath: ApprovalEventMenuPath) {
  return pathname === menuPath || pathname.startsWith(`${menuPath}/`)
}

function readSeenMarkers(storageKey: string | null): SeenMarkers {
  if (!storageKey || typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SeenMarkers
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistSeenMarkers(storageKey: string | null, markers: SeenMarkers) {
  if (!storageKey || typeof window === 'undefined') return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(markers))
  } catch {
    // localStorage를 사용할 수 없는 환경에서는 현재 세션 상태만 유지한다.
  }
}

function snapshotIsNewer(snapshot: AdminApprovalEventSnapshot, seen?: SeenMarker) {
  if (snapshot.count <= 0 || !snapshot.latestCreatedAt) return false
  if (!seen?.latestCreatedAt) return true

  const snapshotTime = Date.parse(snapshot.latestCreatedAt)
  const seenTime = Date.parse(seen.latestCreatedAt)

  if (Number.isNaN(snapshotTime) || Number.isNaN(seenTime)) {
    return snapshot.latestCreatedAt !== seen.latestCreatedAt
      || snapshot.latestEventKey !== seen.latestEventKey
  }

  if (snapshotTime > seenTime) return true
  if (snapshotTime < seenTime) return false
  return snapshot.latestEventKey !== seen.latestEventKey
}

export function useAdminApprovalEventDots({
  enabled,
  pathname,
  userId,
}: UseAdminApprovalEventDotsParams) {
  const storageKey = storageKeyFor(userId)
  const [seenMarkers, setSeenMarkers] = useState<SeenMarkers>({})
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null)

  useEffect(() => {
    setSeenMarkers(readSeenMarkers(storageKey))
    setLoadedStorageKey(storageKey)
  }, [storageKey])

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return
    persistSeenMarkers(storageKey, seenMarkers)
  }, [loadedStorageKey, seenMarkers, storageKey])

  const { data } = useQuery({
    queryKey: APPROVAL_EVENT_SNAPSHOT_KEY,
    queryFn: () => adminDashboardApi.getApprovalEventSnapshots().then((res) => res.data.data),
    enabled: enabled && storageKey != null && loadedStorageKey === storageKey,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const snapshotsByPath = useMemo(() => {
    const next: Partial<Record<ApprovalEventMenuPath, AdminApprovalEventSnapshot>> = {}
    for (const snapshot of data?.queues ?? []) {
      if (isApprovalEventMenuPath(snapshot.path)) {
        next[snapshot.path] = snapshot
      }
    }
    return next
  }, [data?.queues])

  const activeApprovalMenuPath = useMemo(
    () => APPROVAL_EVENT_MENU_PATHS.find((path) => matchesMenuPath(pathname, path)),
    [pathname],
  )

  useEffect(() => {
    if (!activeApprovalMenuPath) return
    const snapshot = snapshotsByPath[activeApprovalMenuPath]
    if (!snapshot?.latestCreatedAt) return

    setSeenMarkers((prev) => {
      const current = prev[activeApprovalMenuPath]
      if (
        current?.latestCreatedAt === snapshot.latestCreatedAt
        && current?.latestEventKey === snapshot.latestEventKey
      ) {
        return prev
      }

      return {
        ...prev,
        [activeApprovalMenuPath]: {
          latestCreatedAt: snapshot.latestCreatedAt,
          latestEventKey: snapshot.latestEventKey,
        },
      }
    })
  }, [activeApprovalMenuPath, snapshotsByPath])

  return useCallback((path: string) => {
    if (!isApprovalEventMenuPath(path)) return false
    if (activeApprovalMenuPath === path) return false

    const snapshot = snapshotsByPath[path]
    return snapshot ? snapshotIsNewer(snapshot, seenMarkers[path]) : false
  }, [activeApprovalMenuPath, seenMarkers, snapshotsByPath])
}
