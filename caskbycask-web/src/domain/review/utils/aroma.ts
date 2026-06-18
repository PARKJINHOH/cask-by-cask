export interface AromaNotes {
  ids: string[]
  custom: string[]
}

export const EMPTY_AROMA_NOTES: AromaNotes = { ids: [], custom: [] }

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
