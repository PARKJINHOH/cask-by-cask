export const MAX_HASHTAGS = 10
export const MAX_HASHTAG_LENGTH = 30

export function parseHashtagInput(input: string): string[] {
  const seen = new Set<string>()
  const hashtags: string[] = []

  for (const raw of input.split(/[,\s]+/)) {
    const value = raw
      .normalize('NFKC')
      .trim()
      .replace(/^#+/, '')
      .replace(/[^\p{L}\p{N}_-]/gu, '')
    if (!value) continue
    const dedupeKey = value.toLocaleLowerCase()
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey)
      hashtags.push(value)
    }
  }
  return hashtags
}

export function formatHashtagInput(hashtags?: string[] | null): string {
  return (hashtags ?? []).map((hashtag) => `#${hashtag}`).join(' ')
}
