import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { buildBreadcrumbSchema } from '@/shared/utils/seoSchema'
import { usePublicFaqs } from '@/domain/faq/hooks/useFaq'
import type { FaqItem } from '@/domain/faq/types/faq.types'

function FaqItemRow({ qa, open, onToggle }: { qa: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 py-4 text-left
          hover:bg-neutral-50/60 transition-colors px-2"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-neutral-900 leading-snug">{qa.question}</span>
        <svg
          className={`w-4 h-4 mt-1.5 flex-shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-2 pb-5 text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{qa.answer}</div>
      )}
    </div>
  )
}

export default function FaqPage() {
  const { i18n } = useTranslation()
  const defaultLang = i18n.language === 'en' ? 'en' : 'ko'
  const langPrefix = defaultLang === 'en' ? '/en' : '/ko'

  const [lang, setLang] = useState<'ko' | 'en'>(defaultLang)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const { data: rawGroups, isLoading } = usePublicFaqs(lang)
  const groups = rawGroups ?? []

  const toggle = (key: string) => setOpenKey((prev) => (prev === key ? null : key))

  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: defaultLang === 'en' ? 'Home' : '홈', path: langPrefix },
    { name: defaultLang === 'en' ? 'FAQ' : '자주 묻는 질문', path: `${langPrefix}/faq` },
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoMeta
        title="자주 묻는 질문 (FAQ)"
        description="위스키, 와인, 꼬냑 등 주류에 대한 자주 묻는 질문 — NAS, 캐스크 타입, 피티드, VSOP/XO 등급, 빈티지 등 핵심 용어 정리. CaskByCask FAQ."
        canonical={buildCanonical(`${langPrefix}/faq`)}
        keywords="위스키 FAQ, 꼬냑 FAQ, 와인 FAQ, NAS, VSOP, XO, 캐스크, 피티드, 빈티지, whisky FAQ, cognac grade, single malt, bourbon"
        jsonLd={[breadcrumbJsonLd]}
      />

      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">자주 묻는 질문</h1>
        <p className="mt-1 text-sm text-neutral-500">
          위스키 · 와인 · 꼬냑 등 주류 기본 용어와 CaskByCask 사용법.
        </p>
      </div>

      {/* 언어 탭 */}
      <div className="flex gap-1 mb-8 border-b border-neutral-200">
        <button
          onClick={() => { setLang('ko'); setOpenKey(null) }}
          className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            lang === 'ko'
              ? 'border-primary-800 text-primary-800'
              : 'border-transparent text-neutral-400 hover:text-neutral-700'
          }`}
        >
          국문
        </button>
        <button
          onClick={() => { setLang('en'); setOpenKey(null) }}
          className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            lang === 'en'
              ? 'border-primary-800 text-primary-800'
              : 'border-transparent text-neutral-400 hover:text-neutral-700'
          }`}
        >
          English
        </button>
      </div>

      {/* 콘텐츠 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400 text-sm">
          불러오는 중...
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-400 text-sm">
          등록된 FAQ가 없습니다.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="text-base font-bold text-neutral-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-primary-800 inline-block" />
                {group.categoryLabel}
              </h2>
              <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100">
                {group.items.map((item) => {
                  const key = `${group.category}-${item.id}`
                  return (
                    <FaqItemRow
                      key={key}
                      qa={item}
                      open={openKey === key}
                      onToggle={() => toggle(key)}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-neutral-400">
        더 궁금한 점이 있으면{' '}
        <a href="/inquiry" className="text-primary-800 hover:underline">문의하기</a>
        를 이용해주세요.
      </p>
    </div>
  )
}
