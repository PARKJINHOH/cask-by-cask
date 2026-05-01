import { create } from 'zustand'
import type { SpiritCategory, SpiritSort } from '../types/spirit.types'

interface SpiritFilterState {
  keyword: string
  category: SpiritCategory | ''
  country: string
  sort: SpiritSort
  page: number
}

interface SpiritFilterActions {
  setFilter: (filter: Partial<SpiritFilterState>) => void
  resetFilter: () => void
}

const initial: SpiritFilterState = {
  keyword:  '',
  category: '',
  country:  '',
  sort:     'LATEST',
  page:     0,
}

export const useSpiritStore = create<SpiritFilterState & SpiritFilterActions>((set) => ({
  ...initial,
  setFilter: (filter) => set((state) => ({ ...state, ...filter })),
  resetFilter: () => set(initial),
}))
