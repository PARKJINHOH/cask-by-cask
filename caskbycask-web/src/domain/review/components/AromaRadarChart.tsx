import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { AromaProfileItem } from '../types/review.types'

interface Props {
  items: AromaProfileItem[]
  height?: number | string
}

function shortLabel(label: string): string {
  return label.length > 9 ? `${label.slice(0, 8)}…` : label
}

export default function AromaRadarChart({ items, height = 260 }: Props) {
  const data = items.map((item) => ({
    name: shortLabel(item.labelSnapshot),
    fullName: item.labelSnapshot,
    intensity: item.intensity,
  }))

  return (
    <div style={{ height }} aria-hidden="true">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={0}
        initialDimension={{ width: 320, height: typeof height === 'number' ? height : 180 }}
      >
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#d6d3d1" />
          <PolarAngleAxis dataKey="name" tick={{ fill: '#57534e', fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} tick={{ fontSize: 9 }} />
          <Radar
            dataKey="intensity"
            stroke="#b45309"
            fill="#f59e0b"
            fillOpacity={0.28}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value) => [String(value), '']}
            labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullName ?? '')}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
