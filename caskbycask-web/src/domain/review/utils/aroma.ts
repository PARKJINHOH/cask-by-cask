export interface AromaNotes {
  ids: string[]
  custom: string[]
}

import type {
  AromaProfile,
  AromaProfileAromaType,
  AromaProfileItem,
  AromaProfilePhase,
} from '../types/review.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

export interface AromaRef {
  aromaType: AromaProfileAromaType
  aromaKey: string
  labelSnapshot: string
}

export const EMPTY_AROMA_NOTES: AromaNotes = { ids: [], custom: [] }

const AROMA_PROFILE_CATEGORIES: ReadonlySet<SpiritCategory> = new Set(['WHISKY'])

export function supportsAromaProfiles(category: SpiritCategory | null | undefined): boolean {
  return !!category && AROMA_PROFILE_CATEGORIES.has(category)
}

export function parseAromaNotes(raw: string | null | undefined): AromaNotes {
  if (!raw) return { ids: [], custom: [] }
  const ids: string[] = []
  const custom: string[] = []
  for (const part of raw.split(',').filter(Boolean)) {
    if (part.startsWith('c:')) {
      try { custom.push(decodeURIComponent(part.slice(2))) } catch { custom.push(part.slice(2)) }
    } else {
      ids.push(part)
    }
  }
  return { ids, custom }
}

export function serializeAromaNotes(notes: AromaNotes): string | undefined {
  const parts = [
    ...notes.ids,
    ...notes.custom.map((c) => `c:${encodeURIComponent(c)}`),
  ]
  return parts.length > 0 ? parts.join(',') : undefined
}

export function formatAromaId(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function aromaRefs(notes: AromaNotes): AromaRef[] {
  return [
    ...notes.ids.map((id) => ({
      aromaType: 'ID' as const,
      aromaKey: id,
      labelSnapshot: formatAromaId(id),
    })),
    ...notes.custom.map((value) => ({
      aromaType: 'CUSTOM' as const,
      aromaKey: value,
      labelSnapshot: value,
    })),
  ]
}

export function aromaRefKey(ref: Pick<AromaRef, 'aromaType' | 'aromaKey'>): string {
  return `${ref.aromaType}:${ref.aromaKey}`
}

export function profileForPhase(
  profiles: AromaProfile[] | null | undefined,
  phase: AromaProfilePhase,
): AromaProfile | undefined {
  return profiles?.find((profile) => profile.phase === phase)
}

export function replacePhaseProfile(
  profiles: AromaProfile[],
  phase: AromaProfilePhase,
  profile: AromaProfile | null,
): AromaProfile[] {
  const next = profiles.filter((item) => item.phase !== phase)
  if (profile) next.push(profile)
  const order: Record<AromaProfilePhase, number> = { NOSE: 0, PALATE: 1, FINISH: 2 }
  return next.sort((left, right) => order[left.phase] - order[right.phase])
}

export function syncProfileAfterAromaRemoval(
  profile: AromaProfile | undefined,
  removed: Pick<AromaRef, 'aromaType' | 'aromaKey'>,
): AromaProfile | null | undefined {
  if (!profile) return undefined
  const removedKey = aromaRefKey(removed)
  const items = profile.items.filter((item) => aromaRefKey(item) !== removedKey)
  if (items.length === profile.items.length) return profile
  if (items.length < 3) return null
  return { ...profile, items }
}

export function buildProfile(
  phase: AromaProfilePhase,
  refs: AromaRef[],
  intensities: Record<string, number | undefined>,
): AromaProfile {
  const items: AromaProfileItem[] = refs.map((ref) => ({
    ...ref,
    intensity: intensities[aromaRefKey(ref)] ?? 0,
  }))
  return { phase, schemaVersion: 1, items }
}
