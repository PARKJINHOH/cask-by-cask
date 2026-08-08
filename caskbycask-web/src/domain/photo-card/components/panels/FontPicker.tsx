import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ensureEditorFontCssLoaded } from '@/shared/components/imageEditorFontCss'
import {
  getTextFont,
  getTextFontFamily,
  hasNonLatinGlyphs,
  resolveTextFontKey,
  TEXT_FONT_FAMILIES,
  TEXT_FONT_GROUPS,
  TEXT_FONT_WEIGHT_LABEL_KEYS,
  type TextFontFamily,
  type TextFontKey,
} from '@/shared/components/imageEditorText'

interface Props {
  value: string | undefined
  onChange: (fontKey: string) => void
  /** 굵기 칩을 함께 보여 줄지. 빠른 편집 바처럼 자리가 좁은 곳에서는 끈다. */
  showWeights?: boolean
  /** 한 줄짜리 도구 막대에 얹히는 형태 — 높이를 줄이고 이름표를 빼 미리보기에 자리를 몰아 준다. */
  compact?: boolean
  /**
   * 고른 글자의 실제 내용. 있으면 미리보기를 이 문구로 그린다 —
   * 내가 쓸 글이 그 서체로 어떻게 보이는지가 견본 문구보다 낫다. 비면 견본으로 돌아간다.
   */
  sample?: string
}

/** 목록이 버튼보다 좁으면 서체 미리보기가 잘린다. 버튼 폭과 이 값 중 큰 쪽을 쓴다. */
const MENU_MIN_WIDTH = 268
const MENU_MAX_HEIGHT = 320
/** 이보다 낮아지면 목록 구실을 못한다. 화면이 좁으면 이 높이로 열고 안에서 스크롤한다. */
const MENU_MIN_HEIGHT = 160
/** 창 가장자리에서 띄우는 여백 */
const VIEWPORT_MARGIN = 8
/** 버튼과 목록 사이 */
const MENU_GAP = 4

/**
 * 글꼴 선택기 — 가족을 고르고, 굵기를 고른다.
 *
 * ── 왜 두 단계인가 ──
 * 서체가 늘수록 굵기별 항목이 한 줄씩 늘어난다(프리텐다드 4줄, Noto Sans KR 4줄…).
 * 목록에는 가족만 두고 굵기는 고른 뒤에 정하면, 서체를 아무리 추가해도
 * 목록 길이는 '가족 수'만큼만 는다.
 *
 * ── 왜 select 가 아닌가 ──
 * 네이티브 option 은 운영체제 메뉴로 그려져 font-family 가 먹지 않는다(특히 윈도우 크롬).
 * 서체를 고르는 화면에서 서체가 안 보이면 그 자체로 못 쓰는 UI라 직접 그린다.
 *
 * ── 왜 목록을 body 로 빼는가 ──
 * 캔버스 위 빠른 편집 바에서도 쓴다. 그 자리는 overflow-hidden 안이라 목록이 잘리고,
 * 카드가 화면 아래쪽에 있으면 목록이 창 밖으로 내려가 손이 닿지 않는다.
 * body 로 빼서 fixed 로 놓고, 아래가 좁으면 위로 뒤집는다.
 *
 * 미리보기 문구는 고른 글자의 내용(sample)이다 — 견본 문구가 예뻐 봐야, 정작 내가 쓴 글이
 * 그 서체로 어떻게 보이는지는 골라 보기 전까지 알 수 없다.
 * 내용이 비었을 때만 견본으로 돌아가고, 견본은 그룹에 따라 다르다 — 영문 서체에 한글을
 * 보여 주면 자소가 없어 Pretendard 로 폴백되고, 결국 "전부 같은 글꼴"로 보인다.
 */
const sampleFor = (groupKey: string) => (
  groupKey === 'latin' ? 'Whisky Cask 2026' : '위스키 한 잔 Whisky'
)

/**
 * 미리보기에 쓰는 글자 수 상한.
 *
 * 이만큼이면 서체는 충분히 구별된다 — 더 넘기면 어차피 잘리고, 긴 문구는 이름표까지 밀어내
 * 어떤 서체인지 되레 알기 어려워진다.
 */
const SAMPLE_MAX_LENGTH = 20

/**
 * 내용을 미리보기 한 줄로 다듬는다.
 *
 * 줄바꿈은 공백으로 눕힌다 — 미리보기는 한 줄짜리 자리라 여러 줄을 넣어 봐야 첫 줄만 보인다.
 * 공백뿐이면 null 을 돌려 견본 문구로 넘긴다.
 */
const sampleFromContent = (text: string | undefined): string | null => {
  const collapsed = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!collapsed) return null
  return collapsed.length > SAMPLE_MAX_LENGTH
    ? `${collapsed.slice(0, SAMPLE_MAX_LENGTH)}…`
    : collapsed
}

interface MenuBox {
  left: number
  top: number
  width: number
  maxHeight: number
}

export default function FontPicker({
  value, onChange, showWeights = true, compact = false, sample,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const current = getTextFont((value ?? 'pretendardBold') as TextFontKey)
  const currentFamily = getTextFontFamily(current.key)

  // 한글 자소가 없는 서체에 한글 문구를 걸면 Pretendard 로 떨어져 서체가 구별되지 않는다.
  // 그런 가족에서만 견본으로 되돌린다 — 나머지는 내용 그대로 보여 준다.
  const content = sampleFromContent(sample)
  const contentNeedsLatinFallback = content != null && hasNonLatinGlyphs(content)
  const previewFor = (family: TextFontFamily) => (
    content != null && !(contentNeedsLatinFallback && family.latinOnly)
      ? content
      : sampleFor(family.groupKey)
  )

  useEffect(() => { if (open) void ensureEditorFontCssLoaded() }, [open])

  // 창 안에 들어오도록 목록 자리를 잡는다. 패널이 스크롤되면 버튼이 움직이므로 같이 따라간다.
  useEffect(() => {
    if (!open) {
      setMenuBox(null)
      return
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(
        Math.max(rect.width, MENU_MIN_WIDTH),
        window.innerWidth - VIEWPORT_MARGIN * 2,
      )
      const below = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN
      const above = rect.top - MENU_GAP - VIEWPORT_MARGIN
      // 아래에 목록이 다 들어가지 않고 위가 더 넓으면 위로 뒤집는다.
      const upward = below < Math.min(MENU_MAX_HEIGHT, above)
      const maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(upward ? above : below, MENU_MIN_HEIGHT))
      setMenuBox({
        left: Math.min(
          Math.max(rect.left, VIEWPORT_MARGIN),
          Math.max(window.innerWidth - width - VIEWPORT_MARGIN, VIEWPORT_MARGIN),
        ),
        top: upward
          ? Math.max(rect.top - MENU_GAP - maxHeight, VIEWPORT_MARGIN)
          : rect.bottom + MENU_GAP,
        width,
        maxHeight,
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      // 목록은 body 에 그려져 컨테이너 밖이다. 여기서 빼지 않으면 항목을 누르는 순간 닫혀
      // click 이 사라진다(누른 요소가 먼저 사라지므로).
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const menu = open && menuBox && (
    <div
      ref={menuRef}
      role="listbox"
      aria-label={t('photoCard.fontLabel')}
      className="di-photo-card-scroll fixed z-[60] overflow-y-auto overscroll-contain rounded-lg border border-neutral-300 bg-white shadow-xl"
      style={{
        left: menuBox.left, top: menuBox.top, width: menuBox.width, maxHeight: menuBox.maxHeight,
      }}
    >
      {TEXT_FONT_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="sticky top-0 bg-neutral-50 px-2.5 py-1 text-[11px] font-bold text-neutral-500">
            {t(group.labelKey)}
          </p>
          {TEXT_FONT_FAMILIES.filter((family) => family.groupKey === group.key).map((family) => {
            // 가족을 바꿔도 지금 굵기와 가장 가까운 것으로 이어 준다.
            const nextKey = resolveTextFontKey(family.key, current.weight)
            const preview = getTextFont(nextKey)
            return (
              <button
                key={family.key}
                type="button"
                role="option"
                aria-selected={family.key === currentFamily.key}
                onClick={() => {
                  onChange(nextKey)
                  setOpen(false)
                }}
                className={`flex w-full items-baseline gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-primary-50 ${
                  family.key === currentFamily.key ? 'bg-primary-50' : ''
                }`}
              >
                <span
                  className="min-w-0 flex-1 truncate text-[15px] leading-tight text-neutral-900"
                  style={{ fontFamily: preview.family, fontWeight: preview.weight }}
                >
                  {previewFor(family)}
                </span>
                <span className="shrink-0 text-[11px] font-medium text-neutral-500">
                  {t(family.labelKey)}
                  {family.weights.length > 1 && (
                    <span className="ml-1 text-neutral-400">{family.weights.length}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <div ref={containerRef} className={compact ? 'relative' : 'relative space-y-1.5'}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={compact ? t(currentFamily.labelKey) : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between text-left transition-colors hover:border-primary-400 ${
          compact
            ? 'h-8 gap-1.5 rounded-md border border-neutral-300 bg-white px-2'
            : 'gap-2 rounded-lg border border-neutral-300 bg-white px-2.5 py-2'
        }`}
      >
        <span
          className="min-w-0 flex-1 truncate text-[15px] leading-tight text-neutral-900"
          style={{ fontFamily: current.family, fontWeight: current.weight }}
        >
          {previewFor(currentFamily)}
        </span>
        {/* 좁은 자리에서는 이름표를 뺀다 — 미리보기 자체가 어떤 서체인지 말해 준다. */}
        {!compact && (
          <span className="shrink-0 text-[11px] font-medium text-neutral-500">
            {t(currentFamily.labelKey)}
          </span>
        )}
        <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-neutral-400" fill="currentColor" aria-hidden="true">
          <path d="M12 15.5L5.5 9h13z" />
        </svg>
      </button>

      {/* 굵기 — 하나뿐인 가족은 고를 것이 없으니 감춘다 */}
      {showWeights && currentFamily.weights.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {currentFamily.weights.map((entry) => (
            <button
              key={entry.fontKey}
              type="button"
              aria-pressed={entry.fontKey === current.key}
              onClick={() => onChange(entry.fontKey)}
              style={{ fontWeight: entry.weight }}
              className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                entry.fontKey === current.key
                  ? 'border-primary-500 bg-primary-600 text-white'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {t(TEXT_FONT_WEIGHT_LABEL_KEYS[entry.weight] ?? 'imageEditor.weightRegular')}
            </button>
          ))}
        </div>
      )}

      {menu && createPortal(menu, document.body)}
    </div>
  )
}
