import { useEffect, useState } from 'react'
import type { PriceVolumeOption, VolumeSelection } from '../types/pricetracker.types'

export function usePriceVolumeSelection(
  options: PriceVolumeOption[] | undefined,
  preferredVolumeMl?: number | null,
) {
  const [selection, setSelection] = useState<VolumeSelection | null>(null)

  useEffect(() => {
    if (!options) return
    const values = options.map<VolumeSelection>((option) => option.volumeMl ?? 'UNKNOWN')
    if (selection != null && values.includes(selection)) return

    if (preferredVolumeMl != null && values.includes(preferredVolumeMl)) {
      setSelection(preferredVolumeMl)
      return
    }

    const mostReportedKnown = options
      .filter((option): option is PriceVolumeOption & { volumeMl: number } => option.volumeMl != null)
      .sort((a, b) => b.count - a.count || a.volumeMl - b.volumeMl)[0]
    if (mostReportedKnown) {
      setSelection(mostReportedKnown.volumeMl)
    } else if (values.includes('UNKNOWN')) {
      setSelection('UNKNOWN')
    } else {
      setSelection(null)
    }
  }, [options, preferredVolumeMl, selection])

  return [selection, setSelection] as const
}
