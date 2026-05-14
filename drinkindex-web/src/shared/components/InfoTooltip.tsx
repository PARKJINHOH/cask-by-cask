import { useState } from 'react'

interface Props { text: string }

export default function InfoTooltip({ text }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1 w-4 h-4 rounded-full bg-neutral-200 text-neutral-500 text-[10px] font-bold
          hover:bg-amber-100 hover:text-amber-700 transition-colors flex items-center justify-center leading-none"
        aria-label="도움말"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-52 rounded-lg bg-neutral-800
          text-white text-xs px-3 py-2 shadow-xl leading-relaxed pointer-events-none">
          {text}
        </span>
      )}
    </span>
  )
}
