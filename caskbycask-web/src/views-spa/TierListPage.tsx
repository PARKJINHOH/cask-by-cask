import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'

import { tierListApi } from '@/domain/tier-list/api/tierListApi'
import type {
  TierListItem,
  TierListItemType,
  TierListGuestDraftPayload,
  TierListRow,
  TierListSavePayload,
} from '@/domain/tier-list/types/tierList.types'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type {
  CognacGrade,
  SpiritCategory,
  SpiritListItem,
  SpiritVariant,
  WhiskyStyle,
  WineBody,
  WineIntensity,
  WineSweetness,
  WineType,
} from '@/domain/spirit/types/spirit.types'
import { producerApi } from '@/domain/producer/api/producerApi'
import {
  PRODUCER_TYPE_LABEL,
  type Producer,
  type ProducerType,
} from '@/domain/producer/types/producer.types'
import CategoryTree from '@/domain/spirit/components/filter/CategoryTree'
import CountryCombobox from '@/domain/spirit/components/filter/CountryCombobox'
import RegionChips from '@/domain/spirit/components/filter/RegionChips'
import RangeSlider from '@/shared/components/RangeSlider'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Modal from '@/shared/components/Modal'
import Pagination from '@/shared/components/Pagination'
import Toast from '@/shared/components/Toast'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { useToast } from '@/shared/hooks/useToast'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { getLocalizedSpiritListNames } from '@/domain/spirit/utils/spiritDisplayName'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import { localizeCountry } from '@/shared/utils/countryName'
import ProducerIcon from '@/shared/components/icons/ProducerIcon'
import { useAuthStore } from '@/domain/auth/store/authStore'

const POOL_KEY = 'pool'
const ITEM_DROP_PREFIX = 'item-drop:'
const GUEST_DRAFT_TOKEN_KEY = 'tier_list_guest_draft_token'
const PRODUCER_QUICK_COUNTRIES = ['스코틀랜드', '프랑스', '미국', '일본', '아일랜드']
const DEFAULT_ROWS: TierListRow[] = [
  { id: null, rowKey: 'S', label: 'S', color: '#f87171', sortOrder: 0 },
  { id: null, rowKey: 'A', label: 'A', color: '#fbbf24', sortOrder: 1 },
  { id: null, rowKey: 'B', label: 'B', color: '#60a5fa', sortOrder: 2 },
  { id: null, rowKey: 'C', label: 'C', color: '#9ca3af', sortOrder: 3 },
]

type LocalTierItem = TierListItem & { localId: string }
type SpiritTarget = {
  id: number
  nameKo: string
  nameEn: string
  primaryImageUrl: string | null
  canonicalPathKo?: string | null
  canonicalPathEn?: string | null
  variantValue?: string | null
  variantValueEn?: string | null
  batchNo?: string | null
  bottledDate?: string | null
  bottledYear?: number | null
  abv?: number | null
  volumeMl?: number | null
}

function itemDropId(localId: string) {
  return `${ITEM_DROP_PREFIX}${localId}`
}

function nextKey(prefix = 'row') {
  return `${prefix}-${crypto.randomUUID()}`
}

function emptyItemCount(items: LocalTierItem[], rowKey: string | null) {
  return items.filter((item) => item.rowKey === rowKey).length
}

function asLocalItems(items: TierListItem[]): LocalTierItem[] {
  return items.map((item) => ({
    ...item,
    localId: item.id != null ? `saved-${item.id}` : nextKey('item'),
  }))
}

function asLocalDraftItems(items: TierListGuestDraftPayload['items']): LocalTierItem[] {
  return items.map((item) => ({
    id: null,
    localId: nextKey('item'),
    rowKey: item.rowKey,
    itemType: item.itemType,
    spiritId: item.spiritId ?? null,
    producerId: item.producerId ?? null,
    displayName: item.displayName,
    imageUrl: item.imageUrl ?? null,
    sortOrder: item.sortOrder,
    spiritVariantLabel: item.spiritVariantLabel ?? null,
    spiritVariantLabelEn: item.spiritVariantLabelEn ?? null,
    spiritCanonicalPathKo: item.spiritCanonicalPathKo ?? null,
    spiritCanonicalPathEn: item.spiritCanonicalPathEn ?? null,
  }))
}

function defaultTitle() {
  return ''
}

function normalizeRows(rows: TierListRow[]) {
  return rows
    .map((row, index) => ({
      ...row,
      rowKey: row.rowKey || String(row.id ?? nextKey('row')),
      sortOrder: index,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function sortItems(items: LocalTierItem[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

function shortVariantLabel(target: {
  variantValue?: string | null
  variantValueEn?: string | null
  batchNo?: string | null
  bottledDate?: string | null
  bottledYear?: number | null
}, isEn: boolean) {
  const variantValue = isEn ? (target.variantValueEn || target.variantValue) : target.variantValue
  return variantValue
    || (target.batchNo ? `Batch ${target.batchNo}` : null)
    || target.bottledDate
    || (target.bottledYear != null ? String(target.bottledYear) : null)
    || null
}

function variantOptionLabel(target: SpiritTarget | SpiritVariant, isEn: boolean) {
  const main = shortVariantLabel(target, isEn) || String(target.id)
  const specs = [
    target.abv != null ? `${target.abv}%` : null,
    target.volumeMl != null ? `${target.volumeMl}ml` : null,
  ].filter(Boolean)
  return specs.length > 0 ? `${main} (${specs.join(', ')})` : main
}

function displayNameForSpirit(target: SpiritTarget, isEn: boolean) {
  return isEn ? (target.nameEn || target.nameKo) : target.nameKo
}

function imageUrlForCanvas(url: string | null) {
  if (!url) return null
  try {
    return new URL(url, window.location.origin).href
  } catch {
    return url
  }
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ratio = Math.min(w / img.width, h / img.height)
  const width = img.width * ratio
  const height = img.height * ratio
  ctx.drawImage(img, x + (w - width) / 2, y + (h - height) / 2, width, height)
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = testLine
    }
  })
  if (line) lines.push(line)
  lines.slice(0, maxLines).forEach((value, index) => {
    ctx.fillText(value, x, y + index * lineHeight)
  })
}

function DroppableArea({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ''} ${isOver ? 'ring-2 ring-primary-400 ring-offset-2' : ''}`}
    >
      {children}
    </div>
  )
}

function TierItemCard({
  item,
  readOnly,
  draggable,
  nameEditable,
  compact = false,
  onNameChange,
  linkTo,
}: {
  item: LocalTierItem
  readOnly: boolean
  draggable: boolean
  nameEditable: boolean
  compact?: boolean
  onNameChange: (value: string) => void
  linkTo?: string | null
}) {
  const { t, i18n } = useTranslation()
  const dragDisabled = !draggable
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, isDragging } = useDraggable({
    id: item.localId,
    disabled: dragDisabled,
  })
  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: itemDropId(item.localId),
    disabled: dragDisabled,
  })
  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 30 : undefined }
    : undefined
  const setNodeRef = (node: HTMLDivElement | null) => {
    setDragNodeRef(node)
    setDropNodeRef(node)
  }
  const variantLabel = i18n.language === 'en'
    ? (item.spiritVariantLabelEn || item.spiritVariantLabel)
    : item.spiritVariantLabel
  const titleMinHeight = compact ? 'min-h-7' : 'min-h-8'
  const titleTextSize = compact ? 'text-[11px]' : 'text-xs'

  const content = (
    <div
      ref={setNodeRef}
      style={style}
      {...(!dragDisabled ? attributes : {})}
      {...(!dragDisabled ? listeners : {})}
      aria-label={!dragDisabled ? t('tierList.dragHandle') : undefined}
      className={`relative aspect-square overflow-hidden border bg-white shadow-sm
        ${compact ? 'rounded-md' : 'rounded-lg'}
        ${isOver
          ? 'border-primary-500 before:absolute before:bottom-2 before:left-0 before:top-2 before:z-20 before:w-1 before:rounded-full before:bg-primary-600'
          : 'border-neutral-200'}
        ${isDragging ? 'opacity-80 shadow-xl' : ''}
        ${!dragDisabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.displayName}
          className="h-full w-full object-contain bg-neutral-50"
          draggable={false}
        />
      ) : item.itemType === 'PRODUCER' ? (
        <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-neutral-400">
          <ProducerIcon size={compact ? 30 : 42} />
        </div>
      ) : (
        <div className="h-full w-full bg-neutral-100 flex items-center justify-center px-3 text-center">
          <span className="text-xs font-semibold text-neutral-400">{item.displayName}</span>
        </div>
      )}
      {variantLabel && (
        <div
          className={`absolute left-1.5 rounded bg-white/92 px-1.5 py-0.5 font-bold leading-none text-red-600 shadow-sm
            ${compact ? 'bottom-7 text-[9px]' : 'bottom-9 text-[10px]'}`}
        >
          {variantLabel}
        </div>
      )}
      <div className="absolute left-0 right-0 bottom-0 bg-black/58 backdrop-blur-[1px]">
        {!nameEditable ? (
          <div className={`${titleMinHeight} px-2 py-1.5 ${titleTextSize} font-semibold leading-tight text-white`}>
            {item.displayName}
          </div>
        ) : (
          <input
            value={item.displayName}
            onChange={(e) => onNameChange(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={t('tierList.itemName')}
            className={`w-full ${titleMinHeight} bg-transparent px-2 py-1.5 ${titleTextSize} font-semibold leading-tight
              text-white placeholder:text-white/60 focus:outline-none`}
          />
        )}
      </div>
    </div>
  )

  if (readOnly && linkTo) {
    return (
      <Link to={linkTo} className="block focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-lg">
        {content}
      </Link>
    )
  }
  return content
}

function TierBoard({
  title,
  description,
  ownerNickname,
  rows,
  items,
  readOnly,
  editMode,
  itemsDraggable,
  presentation = false,
  presentationCardSize,
  presentationColumnCount,
  footer,
  onTitleChange,
  onDescriptionChange,
  onRowChange,
  onRowDelete,
  onItemNameChange,
}: {
  title: string
  description: string
  ownerNickname?: string
  rows: TierListRow[]
  items: LocalTierItem[]
  readOnly: boolean
  editMode: boolean
  itemsDraggable: boolean
  presentation?: boolean
  presentationCardSize?: number
  presentationColumnCount?: number
  footer?: React.ReactNode
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onRowChange: (rowKey: string, patch: Partial<TierListRow>) => void
  onRowDelete: (rowKey: string) => void
  onItemNameChange: (localId: string, value: string) => void
}) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const sortedRows = normalizeRows(rows)
  const canEditRows = !readOnly && editMode

  const linkFor = (item: LocalTierItem) => {
    if (item.itemType === 'SPIRIT' && item.spiritId) {
      return isEn
        ? item.spiritCanonicalPathEn ?? `/spirits/${item.spiritId}`
        : item.spiritCanonicalPathKo ?? `/spirits/${item.spiritId}`
    }
    if (item.itemType === 'PRODUCER' && item.producerId) {
      return `/producers/${item.producerId}`
    }
    return null
  }

  return (
    <section className={`overflow-hidden bg-white ${presentation
      ? 'flex h-screen flex-col border-0 rounded-none'
      : 'border border-neutral-200 rounded-lg'}`}>
      <div className={`${presentation ? 'shrink-0 px-4 py-2 pr-44' : 'px-4 py-4'} border-b border-neutral-100`}>
        <div className="flex flex-wrap items-end gap-2">
          {canEditRows ? (
            <div className="relative min-w-0 flex-1">
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                required
                aria-required="true"
                maxLength={100}
                placeholder={t('tierList.titlePlaceholder')}
                aria-label={t('tierList.formTitle')}
                className="w-full rounded-md border border-transparent bg-neutral-50 px-2 py-1 pr-7 text-xl font-bold text-neutral-950
                  focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 sm:text-2xl"
              />
              <RequiredMark className="absolute right-2 top-1/2 ml-0 -translate-y-1/2" />
            </div>
          ) : readOnly ? (
            <h1 className={`min-w-0 text-xl sm:text-2xl font-bold text-neutral-950 ${presentation ? 'truncate' : ''}`}>
              {title || t('tierList.untitled')}
            </h1>
          ) : (
            <h2 className={`min-w-0 text-xl sm:text-2xl font-bold text-neutral-950 ${presentation ? 'truncate' : ''}`}>
              {title || t('tierList.untitled')}
            </h2>
          )}
          {ownerNickname && (
            <span className="text-xs font-medium text-neutral-400">
              {t('tierList.byOwner', { nickname: ownerNickname })}
            </span>
          )}
        </div>
        {canEditRows && <RequiredFieldsNotice className="mt-2" />}
        {canEditRows ? (
          <input
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            maxLength={1000}
            placeholder={t('tierList.descriptionPlaceholder')}
            aria-label={t('tierList.formDescription')}
            className="mt-2 w-full rounded-md border border-transparent bg-neutral-50 px-2 py-1 text-sm text-neutral-500
              focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        ) : (
          description && (
            <p className={`mt-1 text-sm text-neutral-500 whitespace-pre-line ${presentation ? 'line-clamp-2' : ''}`}>
              {description}
            </p>
          )
        )}
      </div>

      <div
        className={`${presentation ? 'grid min-h-0 flex-1' : ''} divide-y divide-neutral-200`}
        style={presentation ? { gridTemplateRows: `repeat(${Math.max(sortedRows.length, 1)}, minmax(0, 1fr))` } : undefined}
      >
        {sortedRows.map((row) => {
          const rowItems = sortItems(items.filter((item) => item.rowKey === row.rowKey))
          return (
            <div
              key={row.rowKey}
              className={`grid grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[96px_minmax(0,1fr)] ${presentation ? 'min-h-0' : ''}`}
            >
              <div
                className={`${presentation ? 'min-h-0' : 'min-h-32'} flex flex-col items-center justify-center gap-2 px-2 text-center`}
                style={{ backgroundColor: row.color }}
              >
                {!canEditRows ? (
                  <span className="max-w-full break-words px-1 text-2xl font-black leading-tight text-white drop-shadow-sm sm:text-[30px]">
                    {row.label}
                  </span>
                ) : (
                  <div className="flex w-full flex-col items-center gap-1">
                    <input
                      value={row.label}
                      maxLength={50}
                      onChange={(e) => onRowChange(row.rowKey, { label: e.target.value })}
                      aria-label={t('tierList.rowName')}
                      className="w-full rounded-md border border-white/40 bg-white/90 px-1.5 py-1 text-center text-sm
                        font-black text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <div className="flex items-center justify-center gap-1 rounded-full border border-white/35 bg-black/15 p-0.5 shadow-sm backdrop-blur-sm">
                      <label
                        title={t('tierList.rowColor')}
                        className="relative flex h-7 w-8 cursor-pointer items-center justify-center rounded-full text-white
                          transition-colors hover:bg-white/20 focus-within:ring-2 focus-within:ring-white"
                      >
                        <span
                          className="h-4 w-4 rounded-full border-2 border-white shadow-sm ring-1 ring-black/15"
                          style={{ backgroundColor: row.color }}
                          aria-hidden="true"
                        />
                        <input
                          type="color"
                          value={row.color}
                          onChange={(e) => onRowChange(row.rowKey, { color: e.target.value })}
                          aria-label={t('tierList.rowColor')}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRowDelete(row.rowKey)}
                          title={t('tierList.deleteRow')}
                          aria-label={t('tierList.deleteRow')}
                          className="flex h-7 w-8 items-center justify-center rounded-full text-white transition-colors
                            hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5M14 11v5" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DroppableArea
                id={row.rowKey}
                className={`${presentation ? 'h-full min-h-0 p-1.5' : 'min-h-32 p-2 sm:p-3'} bg-neutral-50/70 transition-shadow`}
              >
                {rowItems.length === 0 ? (
                  <div className={`${presentation ? 'min-h-0' : 'min-h-28'} h-full rounded-md border border-dashed border-neutral-200 flex items-center justify-center text-xs text-neutral-400`}>
                    {canEditRows ? t('tierList.dropHere') : t('tierList.emptyRow')}
                  </div>
                ) : (
                  <div
                    className={`${presentation ? 'h-full content-center items-center' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'} grid gap-2`}
                    style={presentation && presentationCardSize && presentationColumnCount
                      ? {
                        gridTemplateColumns: `repeat(${Math.min(rowItems.length, presentationColumnCount)}, ${presentationCardSize}px)`,
                      }
                      : undefined}
                  >
                    {rowItems.map((item) => (
                      <TierItemCard
                        key={item.localId}
                        item={item}
                        readOnly={readOnly}
                        draggable={itemsDraggable}
                        nameEditable={!readOnly && editMode}
                        linkTo={linkFor(item)}
                        onNameChange={(value) => onItemNameChange(item.localId, value)}
                      />
                    ))}
                  </div>
                )}
              </DroppableArea>
            </div>
          )
        })}
      </div>
      {footer && <div className={`${presentation ? 'shrink-0' : ''} border-t border-neutral-200`}>{footer}</div>}
    </section>
  )
}

function CandidatePool({
  items,
  rows,
  draggable,
  nameEditable,
  canRemove,
  onItemNameChange,
  onRemoveItem,
  onMoveItem,
  onAddRow,
  canAddRow,
  presentation = false,
  presentationCardSize,
  presentationColumnCount,
}: {
  items: LocalTierItem[]
  rows: TierListRow[]
  draggable: boolean
  nameEditable: boolean
  canRemove: boolean
  onItemNameChange: (localId: string, value: string) => void
  onRemoveItem: (localId: string) => void
  onMoveItem: (localId: string, rowKey: string) => void
  onAddRow: () => void
  canAddRow: boolean
  presentation?: boolean
  presentationCardSize?: number
  presentationColumnCount?: number
}) {
  const { t } = useTranslation()
  const poolItems = sortItems(items.filter((item) => item.rowKey === null))
  return (
    <DroppableArea
      id={POOL_KEY}
      className={`${presentation ? 'min-h-0 p-1.5' : 'min-h-24 p-2 sm:p-3'} bg-white transition-shadow`}
    >
      <div className={`${presentation ? 'mb-1' : 'mb-2'} flex items-center justify-between`}>
        <h2 className="text-sm font-bold text-neutral-900">{t('tierList.poolTitle')}</h2>
        <span className="text-xs text-neutral-400">{t('tierList.poolCount', { count: poolItems.length })}</span>
      </div>
      <div
        className={`${presentation ? 'grid' : 'flex flex-wrap'} items-start gap-2`}
        style={presentation && presentationCardSize && presentationColumnCount && poolItems.length > 0
          ? {
            gridTemplateColumns: `repeat(${Math.min(poolItems.length, presentationColumnCount)}, ${presentationCardSize}px)`,
          }
          : undefined}
      >
        {nameEditable && (
          <button
            type="button"
            onClick={onAddRow}
            disabled={!canAddRow}
            className="h-9 shrink-0 rounded-lg border border-dashed border-neutral-300 px-3 text-xs font-bold text-neutral-700
              hover:bg-neutral-50 disabled:opacity-50"
          >
            + {t('tierList.addRow')}
          </button>
        )}
        {poolItems.length === 0 ? (
          <div className="flex h-9 min-w-48 flex-1 items-center rounded-md border border-dashed border-neutral-200 px-3 text-xs text-neutral-400">
            {t('tierList.poolEmpty')}
          </div>
        ) : (
          poolItems.map((item) => (
            <div
              key={item.localId}
              className={`relative shrink-0 ${presentation ? '' : 'w-[92px] sm:w-20 lg:w-[86px]'}`}
              style={presentation && presentationCardSize ? { width: presentationCardSize } : undefined}
            >
              {canRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveItem(item.localId)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={t('tierList.removeCandidate')}
                  className="absolute right-1 top-1 z-30 flex h-5 w-5 items-center justify-center rounded-full bg-white/95
                    text-xs font-black leading-none text-neutral-500 shadow-sm hover:bg-danger-50 hover:text-danger-600"
                >
                  x
                </button>
              )}
              <TierItemCard
                item={item}
                readOnly={false}
                draggable={draggable}
                nameEditable={nameEditable}
                compact
                onNameChange={(value) => onItemNameChange(item.localId, value)}
              />
              {!presentation && (
                <select
                  value=""
                  onChange={(e) => onMoveItem(item.localId, e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={t('tierList.mobileMoveToTier')}
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-1 py-1 text-[11px] font-semibold text-neutral-700 sm:hidden"
                >
                  <option value="" disabled>{t('tierList.mobileMoveToTier')}</option>
                  {normalizeRows(rows).map((row) => (
                    <option key={row.rowKey} value={row.rowKey}>{row.label}</option>
                  ))}
                </select>
              )}
            </div>
          ))
        )}
      </div>
    </DroppableArea>
  )
}

function SpiritCandidateCard({
  spirit,
  selectedSpiritIds,
  onAdd,
}: {
  spirit: SpiritListItem
  selectedSpiritIds: Set<number>
  onAdd: (target: SpiritTarget) => void
}) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const names = getLocalizedSpiritListNames(spirit, i18n.language)
  const variantsQuery = useQuery({
    queryKey: ['tier-list-spirit-variants', spirit.id],
    queryFn: () => spiritApi.getVariants(spirit.id).then((res) => res.data.data ?? []),
    staleTime: 60_000,
  })
  const variants = variantsQuery.data ?? []
  const allEditionsSelected = [spirit.id, ...variants.map((variant) => variant.id)]
    .every((id) => selectedSpiritIds.has(id))

  const selectedOptionLabel = (label: string, id: number) => (
    selectedSpiritIds.has(id) ? `\u2713 ${label}` : label
  )

  return (
    <div
      className={`rounded-lg border bg-white p-1.5 text-left transition-colors
        ${allEditionsSelected ? 'border-red-500 bg-red-50/50' : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/40'}`}
    >
      <button
        type="button"
        onClick={() => onAdd(spirit)}
        className="block w-full text-left"
      >
        <div className="mb-1.5 aspect-square overflow-hidden rounded border border-neutral-100 bg-neutral-50">
          {spirit.primaryImageUrl ? (
            <img src={spirit.primaryImageUrl} alt={names.primaryName} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
              {t('tierList.noImage')}
            </div>
          )}
        </div>
        <div className="text-[11px] font-semibold leading-tight text-neutral-900 line-clamp-2">{names.primaryName}</div>
        {names.secondaryName && (
          <div className="mt-0.5 truncate text-[10px] text-neutral-400">{names.secondaryName}</div>
        )}
      </button>

      {variants.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const selectedId = Number(e.target.value)
            if (!selectedId) return
            if (selectedId === spirit.id) {
              onAdd(spirit)
              return
            }
            const variant = variants.find((item) => item.id === selectedId)
            if (variant) {
              onAdd({
                ...variant,
                primaryImageUrl: variant.primaryImageUrl || spirit.primaryImageUrl,
              })
            }
          }}
          aria-label={t('tierList.selectVariant')}
          className={`mt-1.5 w-full rounded border px-1.5 py-1 text-[10px] font-semibold leading-tight focus:outline-none focus:ring-1 focus:ring-primary-400
            ${allEditionsSelected ? 'border-red-500 bg-red-50 text-red-600' : 'border-neutral-200 text-neutral-600'}`}
        >
          <option value="">{t('tierList.selectVariant')}</option>
          <option
            value={spirit.id}
            className={selectedSpiritIds.has(spirit.id) ? 'text-red-600' : undefined}
          >
            {selectedOptionLabel(t('tierList.baseEdition'), spirit.id)}
          </option>
          {variants.map((variant) => (
            <option
              key={variant.id}
              value={variant.id}
              className={selectedSpiritIds.has(variant.id) ? 'text-red-600' : undefined}
            >
              {selectedOptionLabel(variantOptionLabel(variant, isEn), variant.id)}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

function SpiritPicker({
  selectedSpiritIds,
  onAdd,
}: {
  selectedSpiritIds: Set<number>
  onAdd: (target: SpiritTarget) => void
}) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<SpiritCategory | ''>('')
  const [whiskyStyle, setWhiskyStyle] = useState<WhiskyStyle[]>([])
  const [wineType, setWineType] = useState<WineType[]>([])
  const [cognacGrade, setCognacGrade] = useState<CognacGrade[]>([])
  const [wineSweetness, setWineSweetness] = useState<WineSweetness[]>([])
  const [wineBody, setWineBody] = useState<WineBody[]>([])
  const [wineAcidity, setWineAcidity] = useState<WineIntensity[]>([])
  const [wineTannin, setWineTannin] = useState<WineIntensity[]>([])
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [abvRange, setAbvRange] = useState<[number, number]>([0, 100])
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100])
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword)

  useEffect(() => {
    setPage(0)
  }, [
    keyword,
    category,
    whiskyStyle,
    wineType,
    cognacGrade,
    wineSweetness,
    wineBody,
    wineAcidity,
    wineTannin,
    country,
    region,
    abvRange,
    scoreRange,
  ])

  const { data, isLoading } = useQuery({
    queryKey: [
      'tier-list-spirit-picker',
      debouncedKeyword,
      category,
      whiskyStyle,
      wineType,
      cognacGrade,
      wineSweetness,
      wineBody,
      wineAcidity,
      wineTannin,
      country,
      region,
      abvRange,
      scoreRange,
      page,
    ],
    queryFn: () =>
      spiritApi.search({
        keyword: debouncedKeyword.trim() || undefined,
        category: category || undefined,
        whiskyStyle: whiskyStyle.length ? whiskyStyle : undefined,
        wineType: wineType.length ? wineType : undefined,
        cognacGrade: cognacGrade.length ? cognacGrade : undefined,
        wineSweetness: wineSweetness.length ? wineSweetness : undefined,
        wineBody: wineBody.length ? wineBody : undefined,
        wineAcidity: wineAcidity.length ? wineAcidity : undefined,
        wineTannin: wineTannin.length ? wineTannin : undefined,
        country: country || undefined,
        region: region || undefined,
        minAbv: abvRange[0] > 0 ? abvRange[0] : undefined,
        maxAbv: abvRange[1] < 100 ? abvRange[1] : undefined,
        minScore: scoreRange[0] > 0 ? scoreRange[0] : undefined,
        maxScore: scoreRange[1] < 100 ? scoreRange[1] : undefined,
        sort: 'LATEST',
        page,
        size: 18,
      }).then((res) => res.data.data),
    staleTime: 30_000,
  })

  const resetFilters = () => {
    setKeyword('')
    setCategory('')
    setWhiskyStyle([])
    setWineType([])
    setCognacGrade([])
    setWineSweetness([])
    setWineBody([])
    setWineAcidity([])
    setWineTannin([])
    setCountry('')
    setRegion('')
    setAbvRange([0, 100])
    setScoreRange([0, 100])
    setPage(0)
  }

  return (
    <div className="space-y-3">
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={t('tierList.searchSpirit')}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-3 rounded-lg border border-neutral-200 p-2.5">
          <CategoryTree
            category={category}
            whiskyStyle={whiskyStyle}
            wineType={wineType}
            cognacGrade={cognacGrade}
            wineSweetness={wineSweetness}
            wineBody={wineBody}
            wineAcidity={wineAcidity}
            wineTannin={wineTannin}
            onCategory={(value) => {
              setCategory(value)
              setRegion('')
            }}
            onWhiskyStyle={setWhiskyStyle}
            onWineType={setWineType}
            onCognacGrade={setCognacGrade}
            onWineSweetness={setWineSweetness}
            onWineBody={setWineBody}
            onWineAcidity={setWineAcidity}
            onWineTannin={setWineTannin}
          />
          <CountryCombobox category={category} value={country} onChange={(value) => {
            setCountry(value)
            setRegion('')
          }} />
          <RegionChips category={category} country={country} value={region} onChange={setRegion} />
          <div>
            <h3 className="mb-1.5 text-xs font-bold text-neutral-900">{t('spirit.filter.abv')}</h3>
            <RangeSlider min={0} max={100} value={abvRange} onChange={setAbvRange} onChangeEnd={setAbvRange} />
          </div>
          <div>
            <h3 className="mb-1.5 text-xs font-bold text-neutral-900">{t('spirit.filter.score')}</h3>
            <RangeSlider min={0} max={100} value={scoreRange} onChange={setScoreRange} onChangeEnd={setScoreRange} />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-lg border border-neutral-200 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
          >
            {t('spirit.filter.reset')}
          </button>
        </div>
        <div className="min-h-56">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="text-primary-800" />
            </div>
          ) : !data || data.empty ? (
            <div className="rounded-lg border border-dashed border-neutral-200 py-12 text-center text-sm text-neutral-400">
              {t('spirit.noResult.title')}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {data.content.map((spirit) => (
                  <SpiritCandidateCard
                    key={spirit.id}
                    spirit={spirit}
                    selectedSpiritIds={selectedSpiritIds}
                    onAdd={onAdd}
                  />
                ))}
              </div>
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                onPageChange={setPage}
                className="mt-4"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProducerPicker({ onAdd }: { onAdd: (producer: Producer) => void }) {
  const { t, i18n } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [country, setCountry] = useState('')
  const [producerType, setProducerType] = useState<ProducerType | ''>('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword)
  const debouncedCountry = useDebouncedValue(country)

  useEffect(() => {
    setPage(0)
  }, [keyword, country, producerType])

  const { data, isLoading } = useQuery({
    queryKey: ['tier-list-producer-picker', debouncedKeyword, debouncedCountry, producerType, page],
    queryFn: () =>
      producerApi.search({
        keyword: debouncedKeyword.trim() || undefined,
        country: debouncedCountry.trim() || undefined,
        type: producerType || undefined,
        page,
        size: 18,
      })
        .then((res) => res.data.data),
    staleTime: 30_000,
  })
  const isEn = i18n.language === 'en'
  const producerTypes: ProducerType[] = ['DISTILLERY', 'WINERY', 'COGNAC_HOUSE', 'OTHER']

  const resetFilters = () => {
    setKeyword('')
    setCountry('')
    setProducerType('')
    setPage(0)
  }

  return (
    <div className="space-y-3">
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={t('tierList.searchProducer')}
        aria-label={t('tierList.searchProducer')}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-lg border border-neutral-200 p-2.5">
          <div>
            <h3 className="mb-2 text-sm font-bold text-neutral-900">{t('tierList.producerTypeFilter')}</h3>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setProducerType('')}
                aria-pressed={producerType === ''}
                className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  producerType === ''
                    ? 'bg-primary-50 font-semibold text-primary-900'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {t('tierList.allProducerTypes')}
              </button>
              {producerTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProducerType((current) => current === type ? '' : type)}
                  aria-pressed={producerType === type}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    producerType === type
                      ? 'bg-primary-50 font-semibold text-primary-900'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {isEn ? PRODUCER_TYPE_LABEL[type].en : PRODUCER_TYPE_LABEL[type].ko}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-neutral-900">{t('tierList.producerCountryFilter')}</h3>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t('tierList.producerCountryFilter')}
              aria-label={t('tierList.producerCountryFilter')}
              className="mb-2 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRODUCER_QUICK_COUNTRIES.map((value) => {
                const active = country === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCountry(active ? '' : value)}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-primary-800 bg-primary-800 text-white'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-300'
                    }`}
                  >
                    {localizeCountry(value, i18n.language)}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-lg border border-neutral-200 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
          >
            {t('spirit.filter.reset')}
          </button>
        </aside>

        <div className="min-h-56">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="text-primary-800" />
            </div>
          ) : !data || data.empty ? (
            <div className="rounded-lg border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
              {t('producerSelector.noResult')}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {data.content.map((producer) => {
                  const name = isEn ? (producer.nameEn || producer.nameKo) : producer.nameKo
                  return (
                    <button
                      key={producer.id}
                      type="button"
                      onClick={() => onAdd(producer)}
                      className="rounded-lg border border-neutral-200 bg-white p-1.5 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40"
                    >
                      <div className="mb-1.5 flex aspect-square items-center justify-center rounded border border-neutral-100 bg-neutral-50 text-neutral-400">
                        <ProducerIcon size={36} />
                      </div>
                      <div className="text-[11px] font-semibold leading-tight text-neutral-900 line-clamp-2">{name}</div>
                      <div className="mt-0.5 truncate text-[10px] text-neutral-400">{localizeCountry(producer.country, i18n.language)}</div>
                    </button>
                  )
                })}
              </div>
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                onPageChange={setPage}
                className="mt-4"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CustomItemForm({
  onAdd,
  onUploadImage,
}: {
  onAdd: (name: string, imageUrl: string | null) => void
  onUploadImage: (file: File) => Promise<string | null>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setIsUploading(true)
    try {
      let imageUrl: string | null = null
      if (file) {
        imageUrl = await onUploadImage(file)
      }
      onAdd(name.trim(), imageUrl)
      setName('')
      setFile(null)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">{t('tierList.customName')}<RequiredMark /></span>
        <input
          required
          aria-required="true"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('tierList.customName')}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 file:mr-3 file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim() || isUploading}
        className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-900 disabled:opacity-50"
      >
        {isUploading ? t('common.loading', 'Loading') : t('tierList.add')}
      </button>
    </div>
  )
}

function AddPanel({
  selectedSpiritIds,
  onAddSpirit,
  onAddProducer,
  onAddCustom,
  onUploadImage,
}: {
  selectedSpiritIds: Set<number>
  onAddSpirit: (target: SpiritTarget) => void
  onAddProducer: (producer: Producer) => void
  onAddCustom: (name: string, imageUrl: string | null) => void
  onUploadImage: (file: File) => Promise<string | null>
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'spirit' | 'producer' | 'custom'>('spirit')
  const tabs = [
    { key: 'spirit' as const, label: t('tierList.spiritTab') },
    { key: 'producer' as const, label: t('tierList.producerTab') },
    { key: 'custom' as const, label: t('tierList.customTab') },
  ]

  return (
    <section className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-bold text-neutral-900">{t('tierList.addTargets')}</h2>
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === item.key
                ? 'bg-primary-800 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'spirit' && <SpiritPicker selectedSpiritIds={selectedSpiritIds} onAdd={onAddSpirit} />}
      {tab === 'producer' && <ProducerPicker onAdd={onAddProducer} />}
      {tab === 'custom' && <CustomItemForm onAdd={onAddCustom} onUploadImage={onUploadImage} />}
    </section>
  )
}

export default function TierListPage() {
  const { t, i18n } = useTranslation()
  const { shareKey } = useParams<{ shareKey?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toasts, showToast, removeToast } = useToast()
  const { isLoggedIn, isAuthReady } = useAuthStore()
  const readOnly = !!shareKey
  const canPersist = isAuthReady && isLoggedIn
  const selectedId = Number(searchParams.get('id') ?? 0) || null
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const [currentId, setCurrentId] = useState<number | null>(null)
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [rows, setRows] = useState<TierListRow[]>(DEFAULT_ROWS)
  const [items, setItems] = useState<LocalTierItem[]>([])
  const [shareValue, setShareValue] = useState<string | null>(null)
  const [ownerNickname, setOwnerNickname] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isGuestDraftSaving, setIsGuestDraftSaving] = useState(false)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [editMode, setEditMode] = useState(true)
  const [isPresenting, setIsPresenting] = useState(false)
  const [presentationViewport, setPresentationViewport] = useState({ width: 1280, height: 720 })
  const presentationRef = useRef<HTMLDivElement>(null)
  const guestDraftClaimAttemptedRef = useRef(false)
  const selectedSpiritIds = useMemo(
    () => new Set(items.filter((item) => item.itemType === 'SPIRIT' && item.spiritId != null).map((item) => item.spiritId!)),
    [items],
  )

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPresenting(document.fullscreenElement === presentationRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isPresenting) return
    const updateViewport = () => {
      const target = presentationRef.current
      setPresentationViewport({
        width: target?.clientWidth || window.innerWidth,
        height: target?.clientHeight || window.innerHeight,
      })
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    const observer = new ResizeObserver(updateViewport)
    if (presentationRef.current) observer.observe(presentationRef.current)
    return () => {
      window.removeEventListener('resize', updateViewport)
      observer.disconnect()
    }
  }, [isPresenting])

  const presentationLayout = useMemo(() => {
    const rowCount = Math.max(rows.length, 1)
    const poolCount = items.filter((item) => item.rowKey === null).length
    const rowItemCounts = rows.map((row) => items.filter((item) => item.rowKey === row.rowKey).length)
    const maxRowItemCount = Math.max(...rowItemCounts, 0)
    const maxGroupItemCount = Math.max(maxRowItemCount, poolCount, 1)
    const labelWidth = presentationViewport.width >= 640 ? 96 : 72
    const gap = 8
    const contentWidth = Math.max(presentationViewport.width - labelWidth - 24, 1)
    const comfortableCardSize = 112
    const singleLineCapacity = Math.max(1, Math.floor((contentWidth + gap) / (comfortableCardSize + gap)))
    const columnCount = maxGroupItemCount <= singleLineCapacity
      ? maxGroupItemCount
      : Math.ceil(maxGroupItemCount / 2)
    const widthFit = (contentWidth - gap * (columnCount - 1)) / columnCount
    const maxRowLines = Math.max(
      1,
      ...rowItemCounts.map((count) => count > 0 ? Math.ceil(count / columnCount) : 1),
    )
    const poolLines = poolCount > 0 ? Math.ceil(poolCount / columnCount) : 0
    const headerHeight = description.trim() ? 92 : 54
    const poolHeaderHeight = poolCount > 0 ? 38 : 72
    const cardRows = rowCount * maxRowLines + poolLines
    const lineGaps = rowCount * Math.max(maxRowLines - 1, 0) * gap + Math.max(poolLines - 1, 0) * gap
    const verticalPadding = rowCount * 12 + 8
    const heightFit = (
      presentationViewport.height - headerHeight - poolHeaderHeight - verticalPadding - lineGaps
    ) / cardRows
    return {
      cardSize: Math.max(12, Math.floor(Math.min(150, widthFit, heightFit))),
      columnCount,
    }
  }, [description, items, presentationViewport, rows])

  const summariesQuery = useQuery({
    queryKey: ['tier-lists', 'mine'],
    queryFn: () => tierListApi.listMine().then((res) => res.data.data ?? []),
    enabled: !readOnly && canPersist,
  })

  const detailQuery = useQuery({
    queryKey: ['tier-lists', 'mine', selectedId],
    queryFn: () => tierListApi.getMine(selectedId!).then((res) => res.data.data!),
    enabled: !readOnly && canPersist && selectedId != null,
  })

  const sharedQuery = useQuery({
    queryKey: ['tier-lists', 'share', shareKey],
    queryFn: () => tierListApi.getShared(shareKey!).then((res) => res.data.data!),
    enabled: readOnly && !!shareKey,
  })

  const loadedTierList = readOnly ? sharedQuery.data : detailQuery.data

  useEffect(() => {
    if (!readOnly && !selectedId) {
      setCurrentId(null)
      setTitle(defaultTitle())
      setDescription('')
      setRows(DEFAULT_ROWS)
      setItems([])
      setShareValue(null)
      setOwnerNickname(undefined)
      setEditMode(true)
    }
  }, [readOnly, selectedId])

  useEffect(() => {
    if (!loadedTierList) return
    setCurrentId(loadedTierList.id)
    setTitle(loadedTierList.title)
    setDescription(loadedTierList.description ?? '')
    setRows(normalizeRows(loadedTierList.rows))
    setItems(asLocalItems(loadedTierList.items))
    setShareValue(loadedTierList.shareKey)
    setOwnerNickname(loadedTierList.ownerNickname)
    setEditMode(!readOnly)
  }, [loadedTierList])

  useEffect(() => {
    if (!canPersist || readOnly || selectedId || guestDraftClaimAttemptedRef.current) return
    const token = sessionStorage.getItem(GUEST_DRAFT_TOKEN_KEY)
    if (!token) return
    guestDraftClaimAttemptedRef.current = true
    tierListApi.claimGuestDraft(token)
      .then((res) => {
        const content = res.data.data?.content
        if (!content) return
        setCurrentId(null)
        setTitle(content.title ?? '')
        setDescription(content.description ?? '')
        setRows(normalizeRows(content.rows.map((row) => ({ ...row, id: null }))))
        setItems(asLocalDraftItems(content.items ?? []))
        setShareValue(null)
        setOwnerNickname(undefined)
        setEditMode(true)
        sessionStorage.removeItem(GUEST_DRAFT_TOKEN_KEY)
        showToast(t('tierList.guestDraftRestored'), 'success')
      })
      .catch((error: unknown) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        if (status === 404 || status === 410) {
          sessionStorage.removeItem(GUEST_DRAFT_TOKEN_KEY)
          showToast(t('tierList.guestDraftExpired'), 'info')
          return
        }
        guestDraftClaimAttemptedRef.current = false
        showToast(t('tierList.guestDraftRestoreFailed'), 'error')
      })
  }, [canPersist, readOnly, selectedId, showToast, t])

  const updateRow = (rowKey: string, patch: Partial<TierListRow>) => {
    setRows((prev) => prev.map((row) => row.rowKey === rowKey ? { ...row, ...patch } : row))
  }

  const deleteRow = (rowKey: string) => {
    setRows((prev) => prev.filter((row) => row.rowKey !== rowKey).map((row, index) => ({ ...row, sortOrder: index })))
    setItems((prev) => prev.map((item) => item.rowKey === rowKey ? { ...item, rowKey: null } : item))
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: null, rowKey: nextKey('row'), label: t('tierList.newRowLabel', { count: prev.length + 1 }), color: '#a3a3a3', sortOrder: prev.length },
    ])
  }

  const updateItemName = (localId: string, value: string) => {
    setItems((prev) => prev.map((item) => item.localId === localId ? { ...item, displayName: value } : item))
  }

  const removeCandidateItem = (localId: string) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId || item.rowKey !== null))
  }

  const moveCandidateToRow = (localId: string, rowKey: string) => {
    setItems((prev) => {
      const activeItem = prev.find((item) => item.localId === localId && item.rowKey === null)
      if (!activeItem || !rows.some((row) => row.rowKey === rowKey)) return prev
      const nextSortOrder = prev.filter((item) => item.rowKey === rowKey).length
      const remainingPool = sortItems(prev.filter((item) => item.rowKey === null && item.localId !== localId))
      const poolOrder = new Map(remainingPool.map((item, index) => [item.localId, index]))
      return prev.map((item) => {
        if (item.localId === localId) return { ...item, rowKey, sortOrder: nextSortOrder }
        if (item.rowKey === null) return { ...item, sortOrder: poolOrder.get(item.localId) ?? item.sortOrder }
        return item
      })
    })
  }

  const resetItems = () => {
    if (items.length === 0) return
    if (!window.confirm(t('tierList.resetConfirm'))) return
    setItems([])
    showToast(t('tierList.resetComplete'), 'success')
  }

  const addLocalItem = (base: {
    itemType: TierListItemType
    spiritId?: number | null
    producerId?: number | null
    displayName: string
    imageUrl?: string | null
    spiritVariantLabel?: string | null
    spiritVariantLabelEn?: string | null
    spiritCanonicalPathKo?: string | null
    spiritCanonicalPathEn?: string | null
  }) => {
    setItems((prev) => {
      const duplicate = prev.some((item) =>
        item.itemType === base.itemType
        && item.spiritId === (base.spiritId ?? null)
        && item.producerId === (base.producerId ?? null)
        && base.itemType !== 'CUSTOM')
      if (duplicate) {
        showToast(t('tierList.alreadyAdded'), 'info')
        return prev
      }
      return [
        ...prev,
        {
          id: null,
          localId: nextKey('item'),
          rowKey: null,
          itemType: base.itemType,
          spiritId: base.spiritId ?? null,
          producerId: base.producerId ?? null,
          displayName: base.displayName,
          imageUrl: base.imageUrl ?? null,
          sortOrder: emptyItemCount(prev, null),
          spiritVariantLabel: base.spiritVariantLabel ?? null,
          spiritVariantLabelEn: base.spiritVariantLabelEn ?? null,
          spiritCanonicalPathKo: base.spiritCanonicalPathKo ?? null,
          spiritCanonicalPathEn: base.spiritCanonicalPathEn ?? null,
        },
      ]
    })
  }

  const addSpirit = (spirit: SpiritTarget) => {
    const isEn = i18n.language === 'en'
    const displayName = displayNameForSpirit(spirit, isEn)
    addLocalItem({
      itemType: 'SPIRIT',
      spiritId: spirit.id,
      displayName,
      imageUrl: spirit.primaryImageUrl,
      spiritVariantLabel: shortVariantLabel(spirit, false),
      spiritVariantLabelEn: shortVariantLabel(spirit, true),
      spiritCanonicalPathKo: spirit.canonicalPathKo ?? getSpiritDetailPath(spirit, 'ko'),
      spiritCanonicalPathEn: spirit.canonicalPathEn ?? getSpiritDetailPath(spirit, 'en'),
    })
  }

  const addProducer = (producer: Producer) => {
    const displayName = i18n.language === 'en' ? (producer.nameEn || producer.nameKo) : producer.nameKo
    addLocalItem({
      itemType: 'PRODUCER',
      producerId: producer.id,
      displayName,
      imageUrl: null,
    })
  }

  const addCustom = (name: string, imageUrl: string | null) => {
    addLocalItem({
      itemType: 'CUSTOM',
      displayName: name,
      imageUrl,
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId || overId === itemDropId(activeId)) return

    setItems((prev) => {
      const activeItem = prev.find((item) => item.localId === activeId)
      if (!activeItem) return prev

      const overLocalId = overId.startsWith(ITEM_DROP_PREFIX)
        ? overId.slice(ITEM_DROP_PREFIX.length)
        : null
      const overItem = overLocalId ? prev.find((item) => item.localId === overLocalId) : null
      if (overLocalId && !overItem) return prev
      const targetRowKey = overItem
        ? overItem.rowKey
        : overId === POOL_KEY ? null : overId
      const oldRowKey = activeItem.rowKey
      const withoutActive = prev.filter((item) => item.localId !== activeId)
      const targetGroup = sortItems(withoutActive.filter((item) => item.rowKey === targetRowKey))
      const movedItem = { ...activeItem, rowKey: targetRowKey }
      const insertIndex = overItem
        ? Math.max(0, targetGroup.findIndex((item) => item.localId === overItem.localId))
        : targetGroup.length
      const targetOrdered = [
        ...targetGroup.slice(0, insertIndex),
        movedItem,
        ...targetGroup.slice(insertIndex),
      ]
      const targetOrder = new Map(targetOrdered.map((item, index) => [item.localId, index]))
      const oldOrder = oldRowKey !== targetRowKey
        ? new Map(sortItems(withoutActive.filter((item) => item.rowKey === oldRowKey)).map((item, index) => [item.localId, index]))
        : new Map<string, number>()

      return prev.map((item) => {
        if (item.localId === activeId) {
          return { ...movedItem, sortOrder: targetOrder.get(activeId) ?? 0 }
        }
        if (item.rowKey === targetRowKey) {
          return { ...item, sortOrder: targetOrder.get(item.localId) ?? item.sortOrder }
        }
        if (oldRowKey !== targetRowKey && item.rowKey === oldRowKey) {
          return { ...item, sortOrder: oldOrder.get(item.localId) ?? item.sortOrder }
        }
        return item
      })
    })
  }

  const buildPayload = (): TierListSavePayload => ({
    title: title.trim(),
    description: description.trim() || null,
    rows: normalizeRows(rows).map((row, index) => ({
      rowKey: row.rowKey,
      label: row.label.trim() || row.rowKey,
      color: row.color,
      sortOrder: index,
    })),
    items: sortItems(items).map((item, index) => ({
      rowKey: item.rowKey,
      itemType: item.itemType,
      spiritId: item.spiritId,
      producerId: item.producerId,
      displayName: item.displayName.trim() || t('tierList.unnamedItem'),
      imageUrl: item.imageUrl,
      sortOrder: index,
    })),
  })

  const buildGuestDraftPayload = (): TierListGuestDraftPayload => ({
    ...buildPayload(),
    items: sortItems(items).map((item, index) => ({
      rowKey: item.rowKey,
      itemType: item.itemType,
      spiritId: item.spiritId,
      producerId: item.producerId,
      displayName: item.displayName.trim() || t('tierList.unnamedItem'),
      imageUrl: item.imageUrl,
      sortOrder: index,
      spiritVariantLabel: item.spiritVariantLabel,
      spiritVariantLabelEn: item.spiritVariantLabelEn,
      spiritCanonicalPathKo: item.spiritCanonicalPathKo,
      spiritCanonicalPathEn: item.spiritCanonicalPathEn,
    })),
  })

  const upsertGuestDraft = async () => {
    const payload = buildGuestDraftPayload()
    const existingToken = sessionStorage.getItem(GUEST_DRAFT_TOKEN_KEY)
    if (existingToken) {
      try {
        await tierListApi.updateGuestDraft(existingToken, payload)
        return existingToken
      } catch (error: unknown) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        if (status !== 404 && status !== 410) throw error
        sessionStorage.removeItem(GUEST_DRAFT_TOKEN_KEY)
      }
    }
    const res = await tierListApi.createGuestDraft(payload)
    const token = res.data.data?.token
    if (!token) throw new Error('Guest tier-list draft token is missing')
    sessionStorage.setItem(GUEST_DRAFT_TOKEN_KEY, token)
    return token
  }

  const continueWithAuth = async (path: '/login' | '/signup') => {
    setIsGuestDraftSaving(true)
    try {
      await upsertGuestDraft()
      navigate(path, { state: { from: { pathname: '/tier-lists' } } })
    } catch {
      showToast(t('tierList.guestDraftSaveFailed'), 'error')
    } finally {
      setIsGuestDraftSaving(false)
    }
  }

  const uploadCustomImage = async (file: File) => {
    if (canPersist) {
      const res = await tierListApi.uploadImage(file)
      return res.data.data?.imageUrl ?? null
    }
    const token = await upsertGuestDraft()
    const res = await tierListApi.uploadGuestDraftImage(token, file)
    return res.data.data?.imageUrl ?? null
  }

  const save = async () => {
    if (!title.trim()) {
      showToast(t('tierList.titleRequired'), 'error')
      return
    }
    setIsSaving(true)
    try {
      const payload = buildPayload()
      const res = currentId
        ? await tierListApi.update(currentId, payload)
        : await tierListApi.create(payload)
      const saved = res.data.data!
      setCurrentId(saved.id)
      setTitle(saved.title)
      setDescription(saved.description ?? '')
      setRows(normalizeRows(saved.rows))
      setItems(asLocalItems(saved.items))
      setShareValue(saved.shareKey)
      setOwnerNickname(saved.ownerNickname)
      setSearchParams({ id: String(saved.id) }, { replace: true })
      await queryClient.invalidateQueries({ queryKey: ['tier-lists', 'mine'] })
      showToast(t('tierList.saved'), 'success')
    } catch {
      showToast(t('tierList.saveFailed'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCurrent = async () => {
    if (!currentId) return
    if (!window.confirm(t('tierList.deleteConfirm'))) return
    await tierListApi.delete(currentId)
    await queryClient.invalidateQueries({ queryKey: ['tier-lists', 'mine'] })
    setSearchParams({}, { replace: true })
    setCurrentId(null)
    setTitle(defaultTitle())
    setDescription('')
    setRows(DEFAULT_ROWS)
    setItems([])
    setShareValue(null)
    showToast(t('tierList.deleted'), 'success')
  }

  const copyShareUrl = async () => {
    if (!canPersist) {
      setAuthPromptOpen(true)
      return
    }
    if (!shareValue) {
      showToast(t('tierList.saveFirst'), 'info')
      return
    }
    const url = `${window.location.origin}/tier-lists/${shareValue}`
    await navigator.clipboard.writeText(url)
    showToast(t('tierList.shareCopied'), 'success')
  }

  const startPresentation = async () => {
    const target = presentationRef.current
    if (!target) return
    try {
      await target.requestFullscreen()
      setIsPresenting(true)
    } catch {
      showToast(t('tierList.presentationFailed'), 'error')
    }
  }

  const exitPresentation = async () => {
    if (!document.fullscreenElement) return
    await document.exitFullscreen()
  }

  const downloadPng = async () => {
    const canvas = document.createElement('canvas')
    const scale = 2
    const width = 1200
    const titleHeight = 120
    const labelWidth = 130
    const rowHeight = 170
    const itemSize = 126
    const gap = 12
    const height = titleHeight + Math.max(rows.length, 1) * rowHeight + 40
    canvas.width = width * scale
    canvas.height = height * scale
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#111827'
    ctx.font = '700 34px Arial'
    ctx.fillText(title || t('tierList.untitled'), 32, 52)
    if (description.trim()) {
      ctx.fillStyle = '#6b7280'
      ctx.font = '400 16px Arial'
      drawWrappedText(ctx, description.trim(), 32, 82, width - 64, 20, 2)
    }

    const sortedRows = normalizeRows(rows)
    for (let rowIndex = 0; rowIndex < sortedRows.length; rowIndex++) {
      const row = sortedRows[rowIndex]
      const y = titleHeight + rowIndex * rowHeight
      ctx.fillStyle = row.color
      ctx.fillRect(32, y, labelWidth, rowHeight - 12)
      ctx.strokeStyle = '#e5e7eb'
      ctx.strokeRect(32, y, labelWidth, rowHeight - 12)
      ctx.fillStyle = '#ffffff'
      const maxLabelFontSize = 46
      ctx.font = `900 ${maxLabelFontSize}px Arial`
      const measuredLabelWidth = Math.max(ctx.measureText(row.label).width, 1)
      const fittedLabelFontSize = Math.max(
        26,
        Math.min(maxLabelFontSize, maxLabelFontSize * ((labelWidth - 20) / measuredLabelWidth)),
      )
      ctx.font = `900 ${fittedLabelFontSize}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(row.label, 32 + labelWidth / 2, y + rowHeight / 2)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(32 + labelWidth, y, width - labelWidth - 64, rowHeight - 12)
      const rowItems = sortItems(items.filter((item) => item.rowKey === row.rowKey))
      for (let index = 0; index < rowItems.length; index++) {
        const item = rowItems[index]
        const x = 32 + labelWidth + gap + index * (itemSize + gap)
        if (x + itemSize > width - 32) break
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, y + 16, itemSize, itemSize)
        ctx.strokeStyle = '#d4d4d4'
        ctx.strokeRect(x, y + 16, itemSize, itemSize)
        const src = imageUrlForCanvas(item.imageUrl)
        if (src) {
          try {
            const img = await loadImage(src)
            drawContain(ctx, img, x + 8, y + 24, itemSize - 16, itemSize - 40)
          } catch {
            ctx.fillStyle = '#e5e5e5'
            ctx.fillRect(x + 8, y + 24, itemSize - 16, itemSize - 40)
          }
        }
        const variantLabel = i18n.language === 'en'
          ? (item.spiritVariantLabelEn || item.spiritVariantLabel)
          : item.spiritVariantLabel
        if (variantLabel) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'
          ctx.fillRect(x + 6, y + 16 + itemSize - 52, Math.min(itemSize - 12, 82), 18)
          ctx.fillStyle = '#dc2626'
          ctx.font = '700 10px Arial'
          drawWrappedText(ctx, variantLabel, x + 10, y + 16 + itemSize - 39, itemSize - 20, 11, 1)
        }
        ctx.fillStyle = 'rgba(0,0,0,0.62)'
        ctx.fillRect(x, y + 16 + itemSize - 34, itemSize, 34)
        ctx.fillStyle = '#ffffff'
        ctx.font = '700 13px Arial'
        drawWrappedText(ctx, item.displayName, x + 8, y + 16 + itemSize - 14, itemSize - 16, 15, 2)
      }
    }

    const link = document.createElement('a')
    link.download = `${(title || 'tier-list').replace(/[\\/:*?"<>|]/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const summaries = summariesQuery.data ?? []
  const isLoading = readOnly ? sharedQuery.isLoading : detailQuery.isLoading
  const lang = i18n.language === 'en' ? 'en' : 'ko'
  const hasEditorId = !readOnly && searchParams.has('id')
  const publicBase = !readOnly && !hasEditorId
  const canonicalSuffix = readOnly && shareKey ? `/tier-lists/${shareKey}` : '/tier-lists'
  const canonical = buildCanonical(`/${lang}${canonicalSuffix}`)
  const alternateKo = buildCanonical(`/ko${canonicalSuffix}`)
  const alternateEn = buildCanonical(`/en${canonicalSuffix}`)
  const seoTitle = publicBase
    ? t('tierList.seoTitle')
    : title ? `${title} | ${t('tierList.title')}` : t('tierList.title')
  const seoDescription = publicBase
    ? t('tierList.seoDescription')
    : description || t('tierList.subtitle')

  if (readOnly && sharedQuery.isError) {
    return (
      <>
        <SeoMeta
          title={t('tierList.notFoundTitle')}
          description={t('tierList.notFoundDesc')}
          canonical={canonical}
          noindex
          locale={lang === 'en' ? 'en_US' : 'ko_KR'}
        />
        <div className="max-w-5xl mx-auto px-4 py-12">
          <EmptyState
            title={t('tierList.notFoundTitle')}
            description={t('tierList.notFoundDesc')}
            action={{ label: t('errors.notFound.goHome'), onClick: () => navigate('/') }}
          />
        </div>
      </>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <SeoMeta
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        noindex={hasEditorId}
        locale={lang === 'en' ? 'en_US' : 'ko_KR'}
        alternateKo={alternateKo}
        alternateEn={alternateEn}
        alternateDefault={alternateKo}
      />

      <Toast toasts={toasts} onRemove={removeToast} />

      <Modal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        title={t('tierList.authPromptTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={() => continueWithAuth('/signup')}
              disabled={isGuestDraftSaving}
              className="rounded-lg border border-primary-800 px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-60"
            >
              {t('auth.signup.title')}
            </button>
            <button
              type="button"
              onClick={() => continueWithAuth('/login')}
              disabled={isGuestDraftSaving}
              className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-900 disabled:opacity-60"
            >
              {isGuestDraftSaving ? t('tierList.guestDraftSaving') : t('auth.login.title')}
            </button>
          </>
        }
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">
          {t('tierList.authPromptDesc')}
        </p>
      </Modal>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <div className="space-y-5">
          {!readOnly && (
            <section className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-950 mr-auto">{t('tierList.seoTitle')}</h1>
                <div className="flex rounded-lg border border-neutral-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    aria-pressed={editMode}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                      editMode ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {t('tierList.editModeOn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    aria-pressed={!editMode}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                      !editMode ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {t('tierList.previewMode')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={isPresenting ? exitPresentation : startPresentation}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {isPresenting ? t('tierList.exitPresentation') : t('tierList.presentationMode')}
                </button>
                <button
                  type="button"
                  onClick={canPersist ? save : () => setAuthPromptOpen(true)}
                  disabled={!isAuthReady || isSaving}
                  className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-900 disabled:opacity-60"
                >
                  {isSaving ? t('tierList.saving') : t('tierList.save')}
                </button>
                {canPersist && currentId && (
                  <button
                    type="button"
                    onClick={deleteCurrent}
                    className="rounded-lg border border-danger-200 px-3 py-2 text-sm font-semibold text-danger-600 hover:bg-danger-50"
                  >
                    {t('common.delete', 'Delete')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={copyShareUrl}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {t('tierList.copyShare')}
                </button>
                <button
                  type="button"
                  onClick={downloadPng}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {t('tierList.downloadImage')}
                </button>
                <button
                  type="button"
                  onClick={resetItems}
                  disabled={items.length === 0}
                  title={t('tierList.resetItems')}
                  aria-label={t('tierList.resetItems')}
                  className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300
                    text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.708L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              </div>

              {isAuthReady && !isLoggedIn && (
                <p className="mt-3 text-xs text-neutral-500">{t('tierList.guestModeNotice')}</p>
              )}

              {summaries.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {summaries.map((summary) => (
                    <button
                      key={summary.id}
                      type="button"
                      onClick={() => setSearchParams({ id: String(summary.id) }, { replace: true })}
                      className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        currentId === summary.id
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {summary.title}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <div
            ref={presentationRef}
            className={isPresenting ? 'relative h-screen w-screen overflow-hidden bg-white' : ''}
          >
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
              {isPresenting && (
                <button
                  type="button"
                  onClick={exitPresentation}
                  className="fixed right-3 top-3 z-50 rounded-full bg-neutral-950/80 px-3 py-2 text-xs font-semibold text-white
                    shadow-lg backdrop-blur hover:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {t('tierList.exitPresentation')}
                </button>
              )}
              <div className={isPresenting ? 'min-h-screen w-full' : ''}>
                <TierBoard
                  title={title}
                  description={description}
                  ownerNickname={readOnly ? ownerNickname : undefined}
                  rows={rows}
                  items={items}
                  readOnly={readOnly}
                  editMode={!readOnly && editMode && !isPresenting}
                  itemsDraggable={!readOnly && (editMode || isPresenting)}
                  presentation={isPresenting}
                  presentationCardSize={presentationLayout.cardSize}
                  presentationColumnCount={presentationLayout.columnCount}
                  footer={!readOnly ? (
                    <CandidatePool
                      items={items}
                      rows={rows}
                      draggable={editMode || isPresenting}
                      nameEditable={editMode && !isPresenting}
                      canRemove={editMode && !isPresenting}
                      onItemNameChange={updateItemName}
                      onRemoveItem={removeCandidateItem}
                      onMoveItem={moveCandidateToRow}
                      onAddRow={addRow}
                      canAddRow={rows.length < 12}
                      presentation={isPresenting}
                      presentationCardSize={presentationLayout.cardSize}
                      presentationColumnCount={presentationLayout.columnCount}
                    />
                  ) : undefined}
                  onTitleChange={setTitle}
                  onDescriptionChange={setDescription}
                  onRowChange={updateRow}
                  onRowDelete={deleteRow}
                  onItemNameChange={updateItemName}
                />
              </div>

              {!readOnly && editMode && !isPresenting && (
                <div className="mt-5 space-y-5">
                  <AddPanel
                    selectedSpiritIds={selectedSpiritIds}
                    onAddSpirit={addSpirit}
                    onAddProducer={addProducer}
                    onAddCustom={addCustom}
                    onUploadImage={uploadCustomImage}
                  />
                </div>
              )}
            </DndContext>
          </div>
        </div>
      )}
    </div>
  )
}
