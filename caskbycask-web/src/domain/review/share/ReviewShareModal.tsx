import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/shared/components/Button'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import ImageLightbox from '@/shared/components/ImageLightbox'
import Modal from '@/shared/components/Modal'
import { SITE_NAME, SITE_URL } from '@/shared/config/site'
import { copyText } from '@/shared/utils/clipboard'
import { localizeCountry } from '@/shared/utils/countryName'
import { localizeSpiritRegion } from '@/shared/utils/regionName'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritDetail } from '@/domain/spirit/types/spirit.types'
import { useAuthStore } from '@/domain/auth/store/authStore'
import StaticPhotoCardCanvas from '@/domain/photo-card/components/StaticPhotoCardCanvas'
import type {
  PhotoCardAromaProfile,
  PhotoCardDataContext,
  PhotoCardReviewInfo,
  PhotoCardSpiritInfo,
} from '@/domain/photo-card/types/photoCard.types'
import type { PhotoCardDraft } from '@/domain/photo-card/utils/photoCardDraft'
import { IDENTITY_PHOTO_TRANSFORM } from '@/domain/photo-card/utils/photoCardRender'
import type { AromaProfile } from '../types/review.types'
import { reviewCommentToText } from '../utils/reviewRichText'
import {
  buildReviewPhotoCardLayout,
  isReviewShareCardAlreadyTall,
  REVIEW_SHARE_PREVIEW_WIDTH,
  reviewShareCardMetrics,
  reviewShareOutputMaxEdgeOf,
  reviewSharePreviewScale,
  reviewShareRecommendedImageOf,
} from './reviewShareLayout'
import type {
  ReviewPhotoCardContent,
  ReviewPhotoCardRouteState,
  ReviewShareCardLength,
  ReviewShareData,
  ReviewShareImagePlacement,
  ReviewShareImageSource,
} from './reviewShare.types'
import { formatScore } from '@/shared/utils/format'

const MAX_UPLOAD_SIZE = 30 * 1024 * 1024

interface Props {
  review: ReviewShareData
  className?: string
}

type ShareTab = 'URL' | 'IMAGE' | 'HTML'
type ImageAction = 'PREVIEW' | 'DOWNLOAD' | 'EDIT'

function ShareIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
    </svg>
  )
}

function score(value: number | null): string {
  return formatScore(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}

function imageFileName(url: string, fallback: string): string {
  try {
    const name = new URL(absoluteUrl(url)).pathname.split('/').pop()
    return name?.includes('.') ? name : fallback
  } catch {
    return fallback
  }
}

async function fetchImageFile(url: string, fallbackName: string): Promise<File> {
  const response = await fetch(absoluteUrl(url), { credentials: 'include' })
  if (!response.ok) throw new Error('IMAGE_FETCH_FAILED')
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error('INVALID_IMAGE')
  return new File([blob], imageFileName(url, fallbackName), { type: blob.type })
}

function spiritInfoOf(
  spirit: SpiritDetail,
  imageUrl: string,
  content: ReviewPhotoCardContent,
): PhotoCardSpiritInfo {
  return {
    spiritId: spirit.id,
    // 리뷰가 작성된 배치/릴리즈 이름을 유지한다. 상세 API의 현재 대표 이름으로 다시
    // 덮으면 편집기로 이동하는 순간 미리보기와 제목이 달라진다.
    nameKo: content.spiritNameKo,
    nameEn: content.spiritNameEn || content.spiritNameKo,
    category: content.category,
    abv: spirit.abv == null ? '' : String(spirit.abv),
    volumeMl: spirit.volumeMl == null ? '' : String(spirit.volumeMl),
    vintageYear: spirit.vintageYear == null ? '' : String(spirit.vintageYear),
    producerNameKo: spirit.producerNameKo || spirit.producerNameEn || '',
    producerNameEn: spirit.producerNameEn || spirit.producerNameKo || '',
    producerCountry: content.country,
    producerLogoUrl: null,
    spiritImageUrl: imageUrl,
    // 미리보기의 ORIGIN 과 동일하게 국가와 산지를 한 칸으로 전달한다.
    region: present(content.country, content.region),
    detail: content.detail,
  }
}

function reviewInfoOf(
  content: ReviewPhotoCardContent,
  aromaProfiles: PhotoCardAromaProfile[],
): PhotoCardReviewInfo {
  return {
    totalScore: content.total,
    noseScore: content.nose,
    tasteScore: content.taste,
    finishScore: content.finish,
    noseNote: content.noseNote,
    tasteNote: content.tasteNote,
    finishNote: content.finishNote,
    overall: content.overall,
    aromaNose: content.aromaNose,
    aromaTaste: content.aromaTaste,
    aromaFinish: content.aromaFinish,
    aromaProfiles,
    attribution: content.attribution,
  }
}

function profileSummary(profiles: AromaProfile[], phase: AromaProfile['phase']): string {
  const profile = profiles.find((item) => item.phase === phase)
  return profile?.items.map((item) => `${item.labelSnapshot} ${item.intensity}`).join(' · ') ?? ''
}

function ageOrVintage(spirit: SpiritDetail, isEn: boolean): string {
  const years = spirit.commonDetail?.ageStatement
  const months = spirit.commonDetail?.ageStatementMonths
  if (years != null) return isEn ? `${years} yr` : `${years}년`
  if (months != null) return isEn ? `${months} mo` : `${months}개월`
  if (spirit.vintageYear != null) return String(spirit.vintageYear)
  if (spirit.volumeMl != null) return `${spirit.volumeMl}ml`
  return ''
}

const present = (...values: string[]): string => values.filter((value) => value.trim()).join(' · ')

export default function ReviewShareModal({ review, className = '' }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const isAuthReady = useAuthStore((state) => state.isAuthReady)
  const isEn = i18n.language === 'en'
  const lang = isEn ? 'en' : 'ko'
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ShareTab>('URL')
  const [imageSource, setImageSource] = useState<ReviewShareImageSource>('SPIRIT')
  const [reviewImageId, setReviewImageId] = useState<number | null>(review.images[0]?.id ?? null)
  const [placement, setPlacement] = useState<ReviewShareImagePlacement>('PORTRAIT')
  const [cardLength, setCardLength] = useState<ReviewShareCardLength>('AUTO')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [uploadEditorOpen, setUploadEditorOpen] = useState(false)
  const [includeAroma, setIncludeAroma] = useState(review.aromaProfiles.length > 0)
  const [imageAction, setImageAction] = useState<ImageAction | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const cardRef = useRef<HTMLCanvasElement>(null)
  const previewViewportRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [cardReady, setCardReady] = useState(false)

  const { data: spirit, isFetching: spiritLoading } = useQuery({
    queryKey: ['spirit', review.spiritId],
    queryFn: () => spiritApi.getDetail(review.spiritId).then((response) => response.data.data!),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const spiritImageUrl = spirit?.primaryImageUrl
    ?? spirit?.images.find((image) => image.isPrimary)?.imageUrl
    ?? spirit?.images[0]?.imageUrl
    ?? null
  const selectedReviewImage = review.images.find((image) => image.id === reviewImageId)
    ?? review.images[0]
    ?? null
  const selectedImageUrl = imageSource === 'SPIRIT'
    ? spiritImageUrl
    : imageSource === 'REVIEW'
      ? selectedReviewImage?.imageUrl ?? null
      : uploadUrl
  const canEditPhotoCard = isAuthReady && isLoggedIn

  useEffect(() => {
    if (!open || spiritLoading) return
    if (!spiritImageUrl && review.images.length > 0 && imageSource === 'SPIRIT') {
      setImageSource('REVIEW')
    } else if (!spiritImageUrl && review.images.length === 0 && imageSource !== 'UPLOAD') {
      setImageSource('UPLOAD')
    }
  }, [imageSource, open, review.images.length, spiritImageUrl, spiritLoading])

  useEffect(() => () => {
    if (uploadUrl) URL.revokeObjectURL(uploadUrl)
  }, [uploadUrl])

  const reviewUrl = `${SITE_URL}/${lang}/reviews/${review.id}`
  const homeUrl = `${SITE_URL}/${lang}`
  const localizedName = isEn ? (review.spiritNameEn || review.spiritNameKo) : review.spiritNameKo
  const content = useMemo<ReviewPhotoCardContent>(() => {
    const category = spirit ? t(`spirit.category.${spirit.category}`) : ''
    const country = localizeCountry(spirit?.country, i18n.language) || ''
    const region = localizeSpiritRegion(spirit?.wineRegion, spirit?.region, i18n.language) || ''
    const producer = isEn
      ? (spirit?.producerNameEn || spirit?.producerNameKo || '')
      : (spirit?.producerNameKo || spirit?.producerNameEn || '')
    const aromaNose = profileSummary(review.aromaProfiles, 'NOSE')
    const aromaTaste = profileSummary(review.aromaProfiles, 'PALATE')
    const aromaFinish = profileSummary(review.aromaProfiles, 'FINISH')
    return {
      brand: SITE_NAME,
      spiritNameKo: review.spiritNameKo,
      spiritNameEn: review.spiritNameEn || review.spiritNameKo,
      scoreLabel: t('review.share.scoreLabel'),
      total: score(review.totalScore),
      infoCategoryLabel: t('review.share.infoCategory'),
      infoOriginLabel: t('review.share.infoOrigin'),
      infoAbvLabel: t('review.share.infoAbv'),
      infoAgedLabel: t('review.share.infoAged'),
      infoProducerLabel: t('review.share.infoProducer'),
      category,
      country,
      region,
      abv: spirit?.abv == null ? '' : `${spirit.abv}%`,
      detail: spirit ? ageOrVintage(spirit, isEn) : '',
      producer,
      noseLabel: t('review.share.noseShort'),
      tasteLabel: t('review.share.tasteShort'),
      finishLabel: t('review.share.finishShort'),
      nose: score(review.noseScore),
      taste: score(review.tasteScore),
      finish: score(review.finishScore),
      noseNote: review.noseNote?.trim() ?? '',
      tasteNote: review.tasteNote?.trim() ?? '',
      finishNote: review.finishNote?.trim() ?? '',
      tastingNotesTitle: t('review.share.tastingNotes'),
      overallTitle: t('review.overall'),
      overall: reviewCommentToText(review.comment),
      aromaNose: aromaNose ? `${t('review.share.noseShort')} · ${aromaNose}` : '',
      aromaTaste: aromaTaste ? `${t('review.share.tasteShort')} · ${aromaTaste}` : '',
      aromaFinish: aromaFinish ? `${t('review.share.finishShort')} · ${aromaFinish}` : '',
      tastingProfileTitle: t('review.share.tastingProfile'),
      attribution: '',
      home: SITE_NAME,
    }
  }, [i18n.language, isEn, review, spirit, t])

  const htmlCode = useMemo(() => {
    const summary = reviewCommentToText(review.comment) || review.noseNote || review.tasteNote || ''
    return `<div style="border:1px solid #e7c98d;padding:16px;border-radius:12px;color:#262626;background:#fffdf8"><a href="${reviewUrl}" style="display:block;text-decoration:none;color:inherit"><strong>${escapeHtml(localizedName)} · ${score(review.totalScore)}</strong><br>${escapeHtml(content.noseLabel)} ${escapeHtml(content.nose)} · ${escapeHtml(content.tasteLabel)} ${escapeHtml(content.taste)} · ${escapeHtml(content.finishLabel)} ${escapeHtml(content.finish)}<br>${escapeHtml(summary)} · @${escapeHtml(review.nickname)}</a><a href="${homeUrl}" style="display:block;margin-top:10px;text-align:right;font-size:11px;letter-spacing:.04em;opacity:.45;text-decoration:none;color:inherit">${SITE_NAME} · caskbycask.net</a></div>`
  }, [content, homeUrl, localizedName, review, reviewUrl])

  const editorAromaProfiles = useMemo<PhotoCardAromaProfile[]>(() => review.aromaProfiles.map((profile) => ({
    phase: profile.phase,
    title: profile.phase === 'NOSE'
      ? t('review.share.noseShort')
      : profile.phase === 'PALATE' ? t('review.share.tasteShort') : t('review.share.finishShort'),
    items: profile.items.map((item) => ({
      label: item.labelSnapshot,
      intensity: item.intensity,
    })),
  })), [review.aromaProfiles, t])

  const cardLengthLocked = useMemo(
    () => isReviewShareCardAlreadyTall(content, placement, includeAroma),
    [content, includeAroma, placement],
  )
  useEffect(() => {
    if (cardLengthLocked && cardLength !== 'AUTO') setCardLength('AUTO')
  }, [cardLength, cardLengthLocked])
  const effectiveCardLength: ReviewShareCardLength = cardLengthLocked ? 'AUTO' : cardLength
  const cardMetrics = useMemo(
    () => reviewShareCardMetrics(content, placement, includeAroma, effectiveCardLength),
    [content, effectiveCardLength, includeAroma, placement],
  )
  const officialLayout = useMemo(
    () => buildReviewPhotoCardLayout(
      content, placement, includeAroma, isEn, effectiveCardLength,
    ),
    [content, effectiveCardLength, includeAroma, isEn, placement],
  )
  const photoCardContext = useMemo<PhotoCardDataContext | null>(() => (
    spirit && selectedImageUrl ? {
      exif: null,
      spirit: spiritInfoOf(spirit, selectedImageUrl, content),
      review: reviewInfoOf(content, editorAromaProfiles),
      user: { place: '', memo: reviewCommentToText(review.comment), date: review.createdAt.slice(0, 10) },
    } : null
  ), [content, editorAromaProfiles, review.comment, review.createdAt, selectedImageUrl, spirit])
  const recommendedImage = useMemo(
    () => reviewShareRecommendedImageOf(placement),
    [placement],
  )
  const reviewOutputMaxEdge = useMemo(
    () => reviewShareOutputMaxEdgeOf(officialLayout),
    [officialLayout],
  )

  useEffect(() => {
    if (!open || tab !== 'IMAGE') return
    const viewport = previewViewportRef.current
    if (!viewport) return

    const updateScale = () => {
      if (viewport.clientWidth > 0) {
        setPreviewScale(reviewSharePreviewScale(viewport.clientWidth))
      }
    }
    updateScale()

    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [open, tab])

  const chooseUpload = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setNotice(t('review.share.imageTypeError'))
      return
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setNotice(t('review.share.imageSizeError'))
      return
    }
    if (uploadUrl) URL.revokeObjectURL(uploadUrl)
    setUploadFile(file)
    setUploadUrl(URL.createObjectURL(file))
    setImageSource('UPLOAD')
    setUploadEditorOpen(true)
    setNotice(null)
  }

  const copy = async (value: string, message: string) => {
    const copied = await copyText(value)
    setNotice(copied ? message : t('review.share.copyFailed'))
  }

  const createImageDataUrl = async (): Promise<string> => {
    if (!cardRef.current || !selectedImageUrl || !cardReady) {
      throw new Error('Review share image is not ready')
    }
    // 편집기에 함께 전달되는 공식 리뷰(가로 1080px) Canvas를 그대로 저장한다.
    return cardRef.current.toDataURL('image/png')
  }

  const previewImage = async () => {
    if (!cardRef.current || !selectedImageUrl || !cardReady) return
    setImageAction('PREVIEW')
    setNotice(null)
    try {
      setPreviewImageUrl(await createImageDataUrl())
    } catch {
      setNotice(t('review.share.imageExportFailed'))
    } finally {
      setImageAction(null)
    }
  }

  const downloadImage = async () => {
    if (!cardRef.current || !selectedImageUrl || !cardReady) return
    setImageAction('DOWNLOAD')
    setNotice(null)
    try {
      const dataUrl = await createImageDataUrl()
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = `caskbycask-review-${review.id}.png`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch {
      setNotice(t('review.share.imageExportFailed'))
    } finally {
      setImageAction(null)
    }
  }

  const openPhotoCard = async () => {
    if (!canEditPhotoCard) return
    if (!spirit || !selectedImageUrl || !photoCardContext) {
      setNotice(t('review.share.selectImageRequired'))
      return
    }
    setImageAction('EDIT')
    setNotice(null)
    try {
      const photo = imageSource === 'UPLOAD' && uploadFile
        ? uploadFile
        : await fetchImageFile(selectedImageUrl, `review-${review.id}.jpg`)
      const draft: PhotoCardDraft = {
        savedAt: Date.now(),
        // 미리보기·공유 저장이 실제로 그린 공식 템플릿 객체를 그대로 넘긴다.
        layout: officialLayout,
        photoTransform: { ...IDENTITY_PHOTO_TRANSFORM },
        exif: null,
        spirit: photoCardContext.spirit,
        review: photoCardContext.review,
        user: photoCardContext.user,
        photo,
        photoName: photo.name,
      }
      const state: ReviewPhotoCardRouteState = {
        reviewPhotoCardDraft: draft,
        reviewPhotoCardSourceId: review.id,
      }
      navigate('/photo-card', { state })
    } catch {
      setNotice(t('review.share.imageLoadFailed'))
      setImageAction(null)
    }
  }

  const previewBaseHeight = REVIEW_SHARE_PREVIEW_WIDTH * cardMetrics.totalHeightRatio
  const previewScaledHeight = previewBaseHeight * previewScale
  const imageBusy = imageAction != null
  const photoCardLoginHintId = `review-share-photo-card-login-${review.id}`
  const cardLengthHintId = `review-share-card-length-${review.id}`

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setNotice(null) }}
        aria-label={t('review.share.open')}
        title={t('review.share.open')}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 transition-colors hover:border-primary-300 hover:text-primary-800 ${className}`}
      >
        <ShareIcon />
      </button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setPreviewImageUrl(null) }}
        title={t('review.share.title')}
        size="2xl"
      >
        <div className="mb-5 grid grid-cols-3 rounded-xl bg-neutral-100 p-1" role="tablist" aria-label={t('review.share.method')}>
          {(['URL', 'IMAGE', 'HTML'] as ShareTab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => { setTab(value); setNotice(null) }}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${tab === value ? 'bg-white text-primary-800 shadow-sm' : 'text-neutral-500'}`}
            >
              {t(`review.share.tab${value}`)}
            </button>
          ))}
        </div>

        {tab === 'URL' && (
          <div className="space-y-3">
            <label htmlFor={`review-share-url-${review.id}`} className="block text-xs font-bold text-neutral-600">{t('review.share.urlLabel')}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id={`review-share-url-${review.id}`} value={reviewUrl} readOnly className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 text-sm text-neutral-600" />
              <Button onClick={() => { void copy(reviewUrl, t('review.share.urlCopied')) }}>{t('common.copy')}</Button>
            </div>
          </div>
        )}

        {tab === 'IMAGE' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
            <div className="space-y-4">
              <section>
                <h3 className="mb-2 text-xs font-bold text-neutral-700">{t('review.share.imageSourceTitle')}</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(['SPIRIT', 'REVIEW', 'UPLOAD'] as ReviewShareImageSource[]).map((source) => {
                    const disabled = source === 'SPIRIT'
                      ? !spiritLoading && !spiritImageUrl
                      : source === 'REVIEW' ? review.images.length === 0 : false
                    return (
                      <label key={source} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${disabled ? 'cursor-not-allowed bg-neutral-50 text-neutral-300' : imageSource === source ? 'border-primary-500 bg-primary-50 font-bold text-primary-900' : 'cursor-pointer border-neutral-200 text-neutral-600'}`}>
                        <input type="radio" name={`review-share-source-${review.id}`} checked={imageSource === source} disabled={disabled} onChange={() => setImageSource(source)} className="accent-primary-800" />
                        {t(`review.share.imageSource${source}`)}
                      </label>
                    )
                  })}
                </div>
              </section>

              {imageSource === 'REVIEW' && review.images.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-bold text-neutral-700">{t('review.share.reviewImageTitle')}</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {review.images.map((image, index) => (
                      <button key={image.id} type="button" onClick={() => setReviewImageId(image.id)} aria-pressed={selectedReviewImage?.id === image.id} className={`h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${selectedReviewImage?.id === image.id ? 'border-primary-700' : 'border-transparent'}`}>
                        <img src={image.imageUrl} alt={t('review.images.previewAlt', { number: index + 1 })} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {imageSource === 'UPLOAD' && (
                <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-center text-sm font-bold text-neutral-600 hover:border-primary-400 hover:text-primary-800">
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => { chooseUpload(event.target.files?.[0]); event.target.value = '' }} />
                    <span className="max-w-full truncate">{uploadFile ? uploadFile.name : t('review.share.uploadImage')}</span>
                  </label>
                  {uploadUrl && (
                    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2">
                      <img src={uploadUrl} alt="" className="h-16 w-14 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-neutral-500">{uploadFile?.name}</p>
                        <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => setUploadEditorOpen(true)}>
                          {t('review.share.editUploadImage')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <section className="grid gap-3 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-bold text-neutral-700">{t('review.share.imagePlacementTitle')}</h3>
                  <div className="grid grid-cols-2 rounded-lg border border-neutral-200 p-1">
                    {(['PORTRAIT', 'LANDSCAPE'] as ReviewShareImagePlacement[]).map((value) => (
                      <button key={value} type="button" onClick={() => setPlacement(value)} aria-pressed={placement === value} className={`rounded-md px-2 py-2 text-xs font-bold ${placement === value ? 'bg-primary-50 text-primary-800' : 'text-neutral-500'}`}>
                        {t(`review.share.imagePlacement${value}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-bold text-neutral-700">{t('review.share.cardLengthTitle')}</h3>
                  <div className="grid grid-cols-2 rounded-lg border border-neutral-200 p-1">
                    {(['AUTO', 'TALL'] as ReviewShareCardLength[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCardLength(value)}
                        disabled={cardLengthLocked}
                        aria-pressed={effectiveCardLength === value}
                        aria-describedby={cardLengthLocked ? cardLengthHintId : undefined}
                        className={`rounded-md px-2 py-2 text-xs font-bold ${
                          effectiveCardLength === value ? 'bg-primary-50 text-primary-800' : 'text-neutral-500'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {t(`review.share.cardLength${value}`)}
                      </button>
                    ))}
                  </div>
                  {cardLengthLocked && (
                    <p id={cardLengthHintId} className="mt-1.5 text-[11px] leading-relaxed text-amber-700">
                      {t('review.share.cardLengthLocked')}
                    </p>
                  )}
                </div>
                <p className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800 sm:col-span-2">
                  {t('review.share.recommendedImage', {
                    resolution: `${recommendedImage.width}×${recommendedImage.height}`,
                    ratio: recommendedImage.ratio,
                  })}
                </p>
                <div className="flex flex-col items-stretch justify-end sm:col-span-2">
                  <label className={`flex h-11 w-full items-center gap-2 rounded-lg border px-3 text-xs font-bold ${review.aromaProfiles.length === 0 ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    <input type="checkbox" checked={includeAroma} disabled={review.aromaProfiles.length === 0} onChange={(event) => setIncludeAroma(event.target.checked)} className="accent-primary-800" />
                    {t('review.share.includeAroma')}
                  </label>
                  {review.aromaProfiles.length === 0 && (
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
                      {t('review.share.aromaUnavailable')}
                    </p>
                  )}
                </div>
              </section>
            </div>

            <div className="mx-auto w-full min-w-0 max-w-[360px]">
              <div
                ref={previewViewportRef}
                style={{ height: previewScaledHeight }}
                className="relative w-full overflow-hidden"
              >
                <div
                  style={{
                    width: REVIEW_SHARE_PREVIEW_WIDTH,
                    height: previewBaseHeight,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {photoCardContext && selectedImageUrl ? (
                    <StaticPhotoCardCanvas
                      canvasRef={cardRef}
                      layout={officialLayout}
                      context={photoCardContext}
                      photoUrl={selectedImageUrl}
                      maxEdge={reviewOutputMaxEdge}
                      onReadyChange={setCardReady}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#fafaf8] px-5 text-center text-xs text-neutral-400">
                      {spiritLoading
                        ? t('review.share.cardRendering')
                        : t('review.share.selectImageRequired')}
                    </div>
                  )}
                </div>
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div className="max-w-[72%] rounded-xl border border-white/70 bg-white/75 px-4 py-2 text-center text-neutral-500 opacity-50 shadow-sm backdrop-blur-[2px]">
                    <p className="text-[10px] font-black tracking-[0.12em]">{t('review.share.summaryImageTitle')}</p>
                    <p className="mt-0.5 text-[8px] font-semibold">{t('review.share.summaryImageHint')}</p>
                  </div>
                </div>
              </div>
              {selectedImageUrl && photoCardContext && !cardReady && (
                <p role="status" className="mt-2 text-center text-[11px] font-medium text-neutral-400">
                  {t('review.share.cardRendering')}
                </p>
              )}
              <div className="mt-3 grid gap-2">
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => { void previewImage() }}
                  isLoading={imageAction === 'PREVIEW'}
                  disabled={!selectedImageUrl || !cardReady || (imageBusy && imageAction !== 'PREVIEW')}
                >
                  {t('review.share.previewImage')}
                </Button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => { void downloadImage() }}
                    isLoading={imageAction === 'DOWNLOAD'}
                    disabled={!selectedImageUrl || !cardReady || (imageBusy && imageAction !== 'DOWNLOAD')}
                  >
                    {t('review.share.saveImage')}
                  </Button>
                  <div className="group relative">
                    <Button
                      fullWidth
                      onClick={() => { void openPhotoCard() }}
                      isLoading={imageAction === 'EDIT'}
                      disabled={!canEditPhotoCard || !selectedImageUrl || spiritLoading || (imageBusy && imageAction !== 'EDIT')}
                      aria-describedby={!canEditPhotoCard && isAuthReady ? photoCardLoginHintId : undefined}
                    >
                      {t('review.share.editPhotoCard')}
                    </Button>
                    {!canEditPhotoCard && isAuthReady && (
                      <div
                        id={photoCardLoginHintId}
                        role="tooltip"
                        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-neutral-800 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-neutral-800" />
                        <span className="relative">{t('review.share.photoCardLoginRequired')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-neutral-400">{t('review.share.singleImageHint')}</p>
              {cardMetrics.extendBottom > 0 && <p className="mt-1 text-center text-[11px] font-semibold text-amber-700">{t('review.share.autoExpandedHint')}</p>}
            </div>
          </div>
        )}

        {tab === 'HTML' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 text-sm text-neutral-700">
              <a href={reviewUrl} className="block text-inherit no-underline">
                <strong className="text-neutral-900">{localizedName} · {score(review.totalScore)}</strong>
                <p className="mt-2">{content.noseLabel} {content.nose} · {content.tasteLabel} {content.taste} · {content.finishLabel} {content.finish}</p>
                <p className="mt-1 text-neutral-500">{reviewCommentToText(review.comment) || review.noseNote || t('review.share.noNote')} · @{review.nickname}</p>
              </a>
              <a href={homeUrl} className="mt-2 ml-auto block w-max text-[11px] text-neutral-500 no-underline opacity-[0.45]">{SITE_NAME} · caskbycask.net</a>
            </div>
            <label htmlFor={`review-share-html-${review.id}`} className="block text-xs font-bold text-neutral-600">{t('review.share.htmlLabel')}</label>
            <textarea id={`review-share-html-${review.id}`} value={htmlCode} readOnly rows={7} className="w-full rounded-xl border border-neutral-300 p-3 font-mono text-xs leading-relaxed text-neutral-600" />
            <Button fullWidth onClick={() => { void copy(htmlCode, t('review.share.htmlCopied')) }}>{t('review.share.copyHtml')}</Button>
          </div>
        )}

        {notice && <p role="status" className="mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">{notice}</p>}
      </Modal>
      <ImageLightbox
        images={previewImageUrl ? [previewImageUrl] : []}
        open={previewImageUrl != null}
        onClose={() => setPreviewImageUrl(null)}
      />
      {uploadEditorOpen && uploadUrl && (
        <ImageEditorModal
          open
          onClose={() => setUploadEditorOpen(false)}
          imageSrc={uploadUrl}
          initialCropRatio={recommendedImage.ratio}
          fitOutputSize={{ width: recommendedImage.width, height: recommendedImage.height }}
          recommendedCropRatio={recommendedImage.ratio}
          recommendedResolution={t('review.share.recommendedImage', {
            resolution: `${recommendedImage.width}×${recommendedImage.height}`,
            ratio: recommendedImage.ratio,
          })}
          isSaving={false}
          onSave={async (file) => {
            if (uploadUrl) URL.revokeObjectURL(uploadUrl)
            setUploadFile(file)
            setUploadUrl(URL.createObjectURL(file))
            setImageSource('UPLOAD')
            setUploadEditorOpen(false)
          }}
        />
      )}
    </>
  )
}
