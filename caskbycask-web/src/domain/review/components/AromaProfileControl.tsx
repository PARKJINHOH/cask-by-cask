import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AromaNotes } from '../utils/aroma'
import type { AromaProfile, AromaProfilePhase } from '../types/review.types'
import AromaProfileChartPanel from './AromaProfileChartPanel'
import AromaProfileEditor from './AromaProfileEditor'

interface Props {
  phase: AromaProfilePhase
  aromaNotes: AromaNotes
  profile?: AromaProfile
  onChange: (profile: AromaProfile | null) => void
}

export default function AromaProfileControl({ phase, aromaNotes, profile, onChange }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const count = aromaNotes.ids.length + aromaNotes.custom.length
  const disabled = count < 3

  return (
    <div className="space-y-3">
      {profile && <AromaProfileChartPanel profiles={[profile]} compact />}

      <div
        className="group relative inline-flex"
        tabIndex={disabled ? 0 : undefined}
        aria-describedby={disabled ? `${phase.toLowerCase()}-profile-help` : undefined}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
        >
          {profile ? t('review.aromaProfile.edit') : t('review.aromaProfile.add')}
        </button>
        {disabled && (
          <span
            id={`${phase.toLowerCase()}-profile-help`}
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-60 rounded-lg bg-neutral-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus:block"
          >
            {t('review.aromaProfile.minimumHelp')}
          </span>
        )}
      </div>

      <AromaProfileEditor
        open={open}
        phase={phase}
        aromaNotes={aromaNotes}
        profile={profile}
        onClose={() => setOpen(false)}
        onSave={onChange}
      />
    </div>
  )
}
