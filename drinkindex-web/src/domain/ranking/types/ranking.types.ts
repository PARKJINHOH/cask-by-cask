export type RankingPeriod = 'ALL' | 'WEEKLY' | 'MONTHLY'

export interface RankingItem {
  rank: number
  userId: number
  nickname: string
  role: string
  currentLevel: number
  maturingPower: number
  weeklyScore: number
  monthlyScore: number
  producerLogoUrl: string | null
}

export interface MyRankItem {
  rank: number
  userId: number
  nickname: string
  currentLevel: number
  maturingPower: number
  periodScore: number
}
