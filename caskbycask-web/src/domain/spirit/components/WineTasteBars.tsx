'use client'

import { useTranslation } from 'react-i18next'
import {
  WINE_TASTE_AXES, WINE_TASTE_MAX_LEVEL, tasteLevel,
} from '@/domain/spirit/data/wineTasteScale'

interface Props {
  /** 상세 응답의 와인 맛 값 (없으면 해당 축은 '미지정') */
  values: {
    sweetness?: string | null
    body?: string | null
    acidity?: string | null
    tannin?: string | null
  }
  /** 값을 고를 수 있게 한다 (관리자 입력용). 미지정이면 읽기 전용 표시 */
  onChange?: (key: 'sweetness' | 'body' | 'acidity' | 'tannin', value: string | null) => void
  /** 관리자 화면은 한국어 고정 */
  admin?: boolean
  className?: string
}

/**
 * 와인 맛 지표 5단계 바 — 관리자 입력과 사용자 표시가 **같은 컴포넌트**를 쓴다.
 *
 * <p>국내 와인 유통(wine21 등)이 당도·산도·바디·타닌을 1~5 단계로 표기하는 관행에 맞춘 UI다.
 * `onChange` 를 주면 각 칸이 버튼이 되어 입력기로 동작하고(같은 칸을 다시 누르면 해제),
 * 주지 않으면 읽기 전용 바로 렌더된다. 두 화면이 어긋날 수 없다.
 *
 * <p>접근성: 색상 채움만으로 정보를 전달하지 않도록 단계 라벨을 함께 표시하고,
 * 읽기 전용일 때는 `role="img"` + aria-label 로 값을 읽어준다.
 */
export default function WineTasteBars({ values, onChange, admin = false, className }: Props) {
  const { t } = useTranslation()
  const tr = (key: string) => t(key, admin ? { lng: 'ko' } : undefined)
  const editable = !!onChange

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {WINE_TASTE_AXES.map((axis) => {
        const value = values[axis.key] ?? null
        const level = tasteLevel(axis.scale, value)
        const valueLabel = value ? tr(`${axis.valueNs}.${value}`) : tr('spirit.taste.unset')

        return (
          <div key={axis.key}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[12px] font-semibold text-neutral-600">{tr(axis.labelKey)}</span>
              <span className={`text-[12px] font-bold ${level ? 'text-amber-700' : 'text-neutral-300'}`}>
                {valueLabel}
              </span>
            </div>

            <div
              className="flex gap-1"
              role={editable ? 'radiogroup' : 'img'}
              aria-label={`${tr(axis.labelKey)} ${valueLabel}`}
            >
              {Array.from({ length: WINE_TASTE_MAX_LEVEL }, (_, i) => {
                const step = i + 1
                const filled = level >= step
                const stepValue = axis.scale[i]
                const base = 'h-2.5 flex-1 rounded-full transition-colors'
                const tone = filled ? 'bg-amber-500' : 'bg-neutral-200'

                if (!editable) {
                  return <span key={step} className={`${base} ${tone}`} aria-hidden="true" />
                }
                return (
                  <button
                    key={step}
                    type="button"
                    role="radio"
                    aria-checked={value === stepValue}
                    aria-label={`${tr(axis.labelKey)} ${tr(`${axis.valueNs}.${stepValue}`)}`}
                    title={tr(`${axis.valueNs}.${stepValue}`)}
                    // 같은 단계를 다시 누르면 해제 — 아는 만큼만 입력하도록
                    onClick={() => onChange!(axis.key, value === stepValue ? null : stepValue)}
                    className={`${base} ${tone} cursor-pointer hover:opacity-80
                      focus:outline-none focus:ring-2 focus:ring-primary-400`}
                  />
                )
              })}
            </div>

            {/* 양 끝 특징 — 바가 어느 방향으로 강해지는지 알려준다 (드라이 ↔ 스위트 등).
                중간 단계는 표기하지 않는다(선택값은 위 우측에 나온다). */}
            <div className="flex items-baseline justify-between mt-1" aria-hidden="true">
              <span className="text-[10.5px] text-neutral-400">
                {tr(`${axis.valueNs}.${axis.scale[0]}`)}
              </span>
              <span className="text-[10.5px] text-neutral-400">
                {tr(`${axis.valueNs}.${axis.scale[axis.scale.length - 1]}`)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
