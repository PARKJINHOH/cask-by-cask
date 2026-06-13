import type { EventCategory } from '../types/event.types'

/**
 * 카테고리별 고정 색상 매핑.
 * - bar     : 달력 막대(채움). 흰 글자 대비 확보.
 * - chip    : 범례/상세의 옅은 칩.
 * - dot     : 단일일 점 표시.
 * - labelKey: 사용자 페이지용 i18n 키 (관리자 페이지는 koLabel 사용).
 */
export interface CategoryMeta {
  bar: string
  chip: string
  dot: string
  labelKey: string
  koLabel: string
}

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  RELEASE: {
    bar: 'bg-amber-600 text-white',
    chip: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
    labelKey: 'calendar.category.release',
    koLabel: '출시',
  },
  FESTIVAL: {
    bar: 'bg-rose-500 text-white',
    chip: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-500',
    labelKey: 'calendar.category.festival',
    koLabel: '페스티벌',
  },
  EVENT: {
    bar: 'bg-sky-600 text-white',
    chip: 'bg-sky-100 text-sky-800',
    dot: 'bg-sky-600',
    labelKey: 'calendar.category.event',
    koLabel: '이벤트',
  },
  ETC: {
    bar: 'bg-emerald-600 text-white',
    chip: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-600',
    labelKey: 'calendar.category.etc',
    koLabel: '기타',
  },
}

export const CATEGORY_ORDER: EventCategory[] = ['RELEASE', 'FESTIVAL', 'EVENT', 'ETC']
