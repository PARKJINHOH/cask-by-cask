import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { priceTrackerApi } from '../api/priceTrackerApi'
import type { DiscountItemDetail, PriceReportChartDetail, PriceReportReportReason } from '../types/pricetracker.types'
import ImageLightbox from '@/shared/components/ImageLightbox'

const REASONS: PriceReportReportReason[] = ['FALSE_PRICE', 'DUPLICATE', 'BAD_IMAGE', 'OTHER']
const fmt = new Intl.NumberFormat('ko-KR')

interface Props {
  detail: PriceReportChartDetail
  isBest: boolean
}

export default function PriceReportCard({ detail, isBest }: Props) {
  const { t } = useTranslation()
  const { isLoggedIn } = useAuthStore()
  const [expanded, setExpanded] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState<PriceReportReportReason>('FALSE_PRICE')
  const [reasonDetail, setReasonDetail] = useState('')
  const [reportDone, setReportDone] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(-1)

  const displayName =
    detail.storeName ?? detail.suggestedStoreName ?? t('price.panel.unknownStore', '직접 등록')
  const reporterLabel = detail.isHotDeal
    ? (detail.reporterNickname ?? '수집')
    : detail.isAnonymous
    ? t('price.panel.anonymous')
    : (detail.reporterNickname ?? t('price.panel.anonymous'))

  const handleReport = async () => {
    try {
      await priceTrackerApi.reportPriceReport(detail.reportId, {
        reason,
        reasonDetail: reason === 'OTHER' ? reasonDetail : undefined,
      })
      setReportDone(true)
    } catch {
      // ignore — toast handled globally
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* 카드 헤더 */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-neutral-900 truncate">{displayName}</span>
              {detail.isHotDeal && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                  핫딜
                </span>
              )}
              {isBest && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
                  {t('price.panel.bestPrice')}
                </span>
              )}
              {detail.isVerified && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">
                  ✓ {t('price.panel.verified')}
                </span>
              )}
              <span className="inline-flex items-center px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-semibold">
                {detail.volumeMl == null ? t('price.volume.unknown') : `${detail.volumeMl.toLocaleString()}ml`}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
              <span>{reporterLabel}</span>
              {detail.purchasedAt && <span>· {detail.purchasedAt}</span>}
            </div>
            {detail.variantLabel && (
              <p className="mt-1 text-xs font-medium text-primary-700">{detail.variantLabel}</p>
            )}
          </div>

          <div className="text-right shrink-0">
            {detail.finalPrice != null && (
              <p className="text-lg font-bold text-primary-700">
                {fmt.format(detail.finalPrice)}
                <span className="text-xs font-normal ml-0.5">원</span>
              </p>
            )}
            {detail.salePrice != null && detail.salePrice !== detail.finalPrice && (
              <p className="text-xs text-neutral-400 line-through">
                {fmt.format(detail.salePrice)}원
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          {expanded ? t('price.panel.hideMore') : t('price.panel.showMore')}
        </button>

      </div>

      {/* 펼침 콘텐츠 */}
      {expanded && (
        <div className="border-t border-neutral-100 p-4 space-y-4 bg-neutral-50">
          {/* 가격 분해 */}
          <PriceBreakdown detail={detail} />

          {/* 면세 할인 항목 */}
          {detail.discountItems.length > 0 && (
            <DiscountBreakdown items={detail.discountItems} regularPrice={detail.regularPrice} finalPrice={detail.finalPrice} />
          )}

          {/* 설명 */}
          {detail.description && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">{t('price.panel.description')}</p>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{detail.description}</p>
            </div>
          )}

          {/* 공개 인증 사진 */}
          {detail.publicImageUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-2">{t('price.panel.images', '인증 사진')}</p>
              <div className="flex gap-2 flex-wrap">
                {detail.publicImageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIdx(i)}
                    className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 hover:ring-2 hover:ring-primary-700 transition"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <ImageLightbox
                images={detail.publicImageUrls}
                initialIndex={lightboxIdx >= 0 ? lightboxIdx : 0}
                open={lightboxIdx >= 0}
                onClose={() => setLightboxIdx(-1)}
              />
            </div>
          )}

          {/* 신고 */}
          {isLoggedIn && !reportDone && !detail.isHotDeal && (
            <div>
              {!reportOpen ? (
                <button
                  onClick={() => setReportOpen(true)}
                  className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                >
                  {t('price.report.title')}
                </button>
              ) : (
                <div className="border border-red-100 rounded-lg p-3 space-y-3 bg-red-50">
                  <p className="text-xs text-neutral-500">{t('price.report.notice')}</p>
                  <div className="flex flex-wrap gap-2">
                    {REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                          reason === r
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-neutral-600 border-neutral-200'
                        }`}
                      >
                        {t(`price.report.reason.${r}`)}
                      </button>
                    ))}
                  </div>
                  {reason === 'OTHER' && (
                    <textarea
                      value={reasonDetail}
                      onChange={(e) => setReasonDetail(e.target.value)}
                      placeholder={t('price.report.detail')}
                      className="w-full text-xs border border-neutral-300 rounded p-2 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-red-300"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReportOpen(false)}
                      className="text-xs text-neutral-400 hover:text-neutral-600"
                    >
                      {t('common.cancel', '취소')}
                    </button>
                    <button
                      onClick={handleReport}
                      className="text-xs text-red-600 font-medium hover:text-red-700"
                    >
                      {t('price.report.submit')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {reportDone && (
            <p className="text-xs text-green-600 font-medium">{t('price.report.success')}</p>
          )}
        </div>
      )}
    </div>
  )
}

function PriceBreakdown({ detail }: { detail: PriceReportChartDetail }) {
  const { t } = useTranslation()
  const rows: { label: string; value: number }[] = []
  if (detail.regularPrice) rows.push({ label: t('price.register.regularPrice'), value: detail.regularPrice })
  if (detail.salePrice) rows.push({ label: t('price.register.salePrice'), value: detail.salePrice })
  if (detail.paybackAmount) rows.push({ label: t('price.register.payback'), value: -detail.paybackAmount })
  if (!rows.length) return null
  return (
    <div className="text-xs space-y-1">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between text-neutral-500">
          <span>{label}</span>
          <span className={value < 0 ? 'text-green-600' : ''}>
            {value < 0 ? '-' : ''}{new Intl.NumberFormat('ko-KR').format(Math.abs(value))}원
          </span>
        </div>
      ))}
    </div>
  )
}

function DiscountBreakdown({
  items,
  regularPrice,
  finalPrice,
}: {
  items: DiscountItemDetail[]
  regularPrice: number | null
  finalPrice: number | null
}) {
  const { t } = useTranslation()
  const fmt = new Intl.NumberFormat('ko-KR')
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-3 text-xs space-y-1.5">
      <p className="font-medium text-neutral-600 mb-2">{t('price.panel.discountBreakdown')}</p>
      {regularPrice != null && (
        <div className="flex justify-between text-neutral-500">
          <span>{t('price.panel.basePrice')}</span>
          <span>{fmt.format(regularPrice)}원</span>
        </div>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex justify-between text-green-700">
          <span>{item.description ?? t(`price.register.discountType.${item.discountType}`)}</span>
          <span>-{fmt.format(item.discountAmount)}원</span>
        </div>
      ))}
      {finalPrice != null && (
        <div className="flex justify-between font-bold text-primary-700 border-t border-neutral-100 pt-1.5">
          <span>{t('price.panel.finalPrice')}</span>
          <span>{fmt.format(finalPrice)}원</span>
        </div>
      )}
    </div>
  )
}
