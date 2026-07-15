import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { tasteTreeApi } from '@/domain/taste-tree/api/tasteTreeApi'
import TasteTreeGraph from '@/domain/taste-tree/components/TasteTreeGraph'
import type { TasteTreeResult, TasteTreeResultItem } from '@/domain/taste-tree/types/tasteTree.types'
import WishlistButtons from '@/domain/wishlist/components/WishlistButtons'
import { useAuthStore } from '@/domain/auth/store/authStore'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

function spiritPath(item: TasteTreeResultItem, isEn: boolean) {
  const canonical = isEn ? item.canonicalPathEn : item.canonicalPathKo
  return canonical?.replace(/^\/(ko|en)/, '') ?? (item.spiritId ? `/spirits/${item.spiritId}` : '')
}

function localizedResultTitle(result: TasteTreeResult, isEn: boolean) {
  return isEn ? result.resultTitleEn || result.resultTitleKo : result.resultTitleKo
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  let cursorY = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY)
      line = word
      cursorY += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, cursorY)
  return cursorY
}

async function captureResult(result: TasteTreeResult, isEn: boolean) {
  const title = localizedResultTitle(result, isEn)
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 520 + result.items.length * 230
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#fafaf9'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#1c1917'
  ctx.fillRect(0, 0, canvas.width, 220)
  ctx.fillStyle = '#fbbf24'
  ctx.font = '700 22px sans-serif'
  ctx.fillText('CaskByCask Whisky Taste Tree', 70, 62)
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 44px sans-serif'
  wrapText(ctx, title, 70, 128, 980, 52)
  ctx.fillStyle = '#d6d3d1'
  ctx.font = '500 18px sans-serif'
  ctx.fillText(isEn ? `Version ${result.versionNumber}` : `Version ${result.versionNumber} 결과`, 70, 185)

  ctx.fillStyle = '#78350f'
  ctx.font = '800 24px sans-serif'
  ctx.fillText(isEn ? 'My taste path' : '나의 취향 경로', 70, 280)
  ctx.fillStyle = '#57534e'
  ctx.font = '600 18px sans-serif'
  const pathText = result.path
    .flatMap((item) => (isEn ? item.selectedLabelsEn : item.selectedLabelsKo))
    .join('  /  ')
  wrapText(ctx, pathText, 70, 320, 1060, 28)

  let y = 390
  result.items.forEach((item, index) => {
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#e7e5e4'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(70, y, 1060, 190, 20)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#b45309'
    ctx.font = '800 17px sans-serif'
    ctx.fillText(`${index + 1} · ${item.matchScore}% MATCH`, 105, y + 42)
    ctx.fillStyle = '#1c1917'
    ctx.font = '800 28px sans-serif'
    ctx.fillText(isEn ? item.nameEn || item.nameKo : item.nameKo, 105, y + 82)
    ctx.fillStyle = '#57534e'
    ctx.font = '500 17px sans-serif'
    wrapText(
      ctx,
      (isEn ? item.recommendationReasonEn : item.recommendationReasonKo) ?? '',
      105,
      y + 120,
      950,
      24,
    )
    y += 220
  })
  ctx.fillStyle = '#78716c'
  ctx.font = '500 15px sans-serif'
  ctx.fillText(window.location.origin, 70, canvas.height - 42)
  const link = document.createElement('a')
  link.download = `${title.replace(/[\\/:*?"<>|]/g, '-')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export default function TasteTreeResultPage() {
  const { shareKey = '' } = useParams<{ shareKey: string }>()
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const { toasts, showToast, removeToast } = useToast()
  const resultQuery = useQuery({
    queryKey: ['taste-trees', 'result', shareKey],
    queryFn: () => tasteTreeApi.getResult(shareKey).then((response) => response.data.data!),
    enabled: Boolean(shareKey),
  })

  if (resultQuery.isLoading) {
    return <div className="mx-auto h-[700px] max-w-6xl animate-pulse rounded-2xl bg-neutral-100 px-4 py-10" />
  }
  if (resultQuery.isError || !resultQuery.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-neutral-950">{t('tasteTree.resultNotFound')}</h1>
        <Link to="/taste-trees" className="mt-5 inline-block rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-bold text-white">
          {t('tasteTree.retry')}
        </Link>
      </div>
    )
  }

  const result = resultQuery.data
  const resultTitle = localizedResultTitle(result, isEn)
  const activeNodeKeys = result.path.map((item) => item.nodeKey)
  const tasteLabels = result.path.flatMap((item) => (isEn ? item.selectedLabelsEn : item.selectedLabelsKo))

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: resultTitle, text: t('tasteTree.shareText'), url })
    } else {
      await navigator.clipboard.writeText(url)
      showToast(t('tasteTree.shareCopied'), 'success')
    }
  }

  const needLogin = () => navigate('/login', { state: { from: location } })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-9">
      <SeoMeta
        title={`${resultTitle} - ${t('tasteTree.result')}`}
        description={result.treeDescription ?? t('tasteTree.subtitle')}
        canonical={buildCanonical(`/taste-trees/result/${shareKey}`)}
      />
      <Toast toasts={toasts} onRemove={removeToast} />

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 px-5 py-8 text-white sm:px-9 sm:py-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">
                {result.treeType === 'OFFICIAL' ? t('tasteTree.officialBadge') : t('tasteTree.userTree')}
              </span>
              <p className="mt-4 text-sm font-semibold text-stone-300">{t('tasteTree.yourTaste')}</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">{resultTitle}</h1>
              {result.ownerNickname && (
                <p className="mt-3 text-xs text-stone-400">{t('tasteTree.createdBy', { nickname: result.ownerNickname })}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => captureResult(result, isEn)} className="rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15">
                {t('tasteTree.capture')}
              </button>
              <button onClick={share} className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-amber-950 hover:bg-amber-300">
                {t('tasteTree.share')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-9">
          {!result.latestVersion && (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-900">{t('tasteTree.oldVersion')}</p>
              <Link to={`/taste-trees/t/${result.treeShareKey}`} className="text-sm font-bold text-amber-900 underline">
                {t('tasteTree.tryLatest')}
              </Link>
            </div>
          )}
          <h2 className="text-sm font-black text-neutral-900">{t('tasteTree.myPath')}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tasteLabels.map((label, index) => (
              <span key={`${label}-${index}`} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">1–3 PICKS</p>
            <h2 className="mt-1 text-2xl font-black text-neutral-950">{t('tasteTree.recommendations')}</h2>
          </div>
          <Link to={`/taste-trees/t/${result.treeShareKey}`} className="text-sm font-bold text-primary-800 hover:underline">
            {t('tasteTree.retry')}
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {result.items.map((item, index) => {
            const primaryName = isEn ? item.nameEn || item.nameKo : item.nameKo
            const secondaryName = isEn ? item.nameKo : item.nameEn
            const reason = isEn
              ? item.recommendationReasonEn || item.recommendationReasonKo
              : item.recommendationReasonKo
            const detailPath = spiritPath(item, isEn)
            return (
              <article key={`${item.spiritId ?? item.nameKo}-${index}`} className="flex overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <div className="w-32 shrink-0 bg-neutral-50 sm:w-40 lg:w-32">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={primaryName} className="h-full min-h-64 w-full object-contain p-3" />
                  ) : (
                    <div className="flex h-full min-h-64 items-center justify-center px-3 text-center text-xs font-semibold text-neutral-400">
                      {t('tasteTree.noImage')}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">
                      {t('tasteTree.match', { score: item.matchScore })}
                    </span>
                    {item.spiritId && (
                      <WishlistButtons spiritId={item.spiritId} onNeedLogin={needLogin} />
                    )}
                  </div>
                  <h3 className="mt-3 text-base font-black leading-5 text-neutral-950">{primaryName}</h3>
                  {secondaryName && secondaryName !== primaryName && (
                    <p className="mt-1 text-xs text-neutral-400">{secondaryName}</p>
                  )}
                  {reason && <p className="mt-3 text-xs leading-5 text-neutral-600">{reason}</p>}
                  {item.type === 'CUSTOM' && item.priceAmount != null && (
                    <div className="mt-3 rounded-lg bg-neutral-50 p-2.5">
                      <p className="text-sm font-bold text-neutral-800">
                        {t('tasteTree.approxPrice', { price: new Intl.NumberFormat(isEn ? 'en-US' : 'ko-KR').format(item.priceAmount), currency: item.currencyCode ?? 'KRW' })}
                      </p>
                      <p className="mt-1 text-[10px] text-neutral-400">{t('tasteTree.creatorPriceNotice')}</p>
                    </div>
                  )}
                  <div className="mt-auto pt-4">
                    {detailPath ? (
                      <Link to={detailPath} className="inline-flex rounded-lg bg-primary-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-900">
                        {t('tasteTree.viewDetail')}
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-neutral-400">{t('tasteTree.customItem')}</span>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-7">
        <TasteTreeGraph content={result.content} activeNodeKeys={activeNodeKeys} />
      </section>

      {!isLoggedIn && (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 text-center">
          <p className="text-sm text-neutral-600">{t('tasteTree.loginForSave')}</p>
          <button onClick={needLogin} className="mt-3 rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-bold text-white">
            {t('auth.login.title')}
          </button>
        </div>
      )}
    </div>
  )
}
