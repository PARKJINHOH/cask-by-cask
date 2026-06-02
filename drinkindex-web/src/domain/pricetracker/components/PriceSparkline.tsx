import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { usePriceChart } from '../hooks/usePriceChart'

interface Props {
  spiritId: number
  storeType?: 'DOMESTIC' | 'DUTYFREE'
}

export default function PriceSparkline({ spiritId, storeType = 'DOMESTIC' }: Props) {
  const { data } = usePriceChart(spiritId, storeType, '3M')

  if (!data?.points.length) {
    return <div className="h-10 flex items-center justify-center text-neutral-200 text-xs">—</div>
  }

  const sparkData = data.points
    .filter((p) => p.minFinalPrice != null)
    .map((p) => ({ v: p.minFinalPrice }))

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={sparkData} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
        <Line
          dataKey="v"
          stroke="#185FA5"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
