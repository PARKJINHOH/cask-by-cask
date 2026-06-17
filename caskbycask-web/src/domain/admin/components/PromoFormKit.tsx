import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { z } from 'zod'
import type { UseFormRegisterReturn } from 'react-hook-form'
import Button from '@/shared/components/Button'

/**
 * 팝업·배너 관리자 폼 공용 키트 — 단일 소스 (SINGLE SOURCE OF TRUTH)
 *
 * AdminPopupFormPage / AdminBannerFormPage 가 공유하는 폼 구성요소·검증 규칙·유틸 모음.
 * 두 화면의 공통 UI(섹션·토글·타입/언어 선택·이미지 드롭존·게시기간·액션 버튼)를 고치려면
 * 이 파일만 수정하면 된다. 페이지별 고유 영역(미리보기, 제출 페이로드, 이미지 슬롯 구성)은
 * 각 페이지가 가진다.
 */

// ─── datetime-local 값 ↔ LocalDateTime 변환 유틸 ──────
export const toInputDt = (iso: string | null | undefined) => (iso ? iso.substring(0, 16) : '')
export const toApiDt   = (input: string | undefined)       => (input ? `${input}:00` : null)

function fixDatetimeYear(val: string) {
  if (!val) return val
  const dashIdx = val.indexOf('-')
  if (dashIdx > 4) return val.slice(dashIdx - 4)
  return val
}

// ─── 공통 Zod 정제 규칙 ───────────────────────────────
export interface PromoRefineValues {
  content?: string
  linkUrl?: string
  isVisible: boolean
  isAlwaysVisible: boolean
  startAt?: string
  endAt?: string
}

/**
 * HTML형 내용 필수 / 링크 URL 형식 / 기간 역전 / 노출 ON 시 상시노출·기간 필수 검증.
 * 각 페이지 스키마의 superRefine 에서 호출.
 */
export function promoSuperRefine(
  data: PromoRefineValues,
  ctx: z.RefinementCtx,
  opts: { isHtml: boolean; contentRequiredMessage: string },
) {
  if (opts.isHtml) {
    const text = data.content?.replace(/<[^>]*>/g, '').trim() ?? ''
    if (!text) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.contentRequiredMessage, path: ['content'] })
    }
  }
  if (data.linkUrl && data.linkUrl.trim() !== '' && !/^https?:\/\/.+/.test(data.linkUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '올바른 URL 형식이어야 합니다 (https://...)',
      path: ['linkUrl'],
    })
  }
  if (!data.isAlwaysVisible && data.startAt && data.endAt && data.endAt < data.startAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '종료일시는 시작일시 이후여야 합니다',
      path: ['endAt'],
    })
  }
  // 노출 ON: 상시 노출 또는 게시 기간(시작·종료) 둘 중 하나는 필수
  if (data.isVisible && !data.isAlwaysVisible) {
    if (!data.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '노출하려면 상시 노출을 체크하거나 시작일시를 입력하세요',
        path: ['startAt'],
      })
    }
    if (!data.endAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '노출하려면 상시 노출을 체크하거나 종료일시를 입력하세요',
        path: ['endAt'],
      })
    }
  }
}

// ─── 섹션 래퍼 ────────────────────────────────────────
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-neutral-800 border-b border-neutral-100 pb-3">
        {title}
      </h2>
      {children}
    </div>
  )
}

// ─── Toggle 스위치 ────────────────────────────────────
export function ToggleSwitch({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
      <div>
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        {description && <p className="text-xs text-neutral-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          checked ? 'bg-primary-800' : 'bg-neutral-300',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow',
            'transform transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

// ─── 관리자 제목 입력 ─────────────────────────────────
export function AdminTitleField({ inputProps, placeholder, error }: {
  inputProps: UseFormRegisterReturn; placeholder: string; error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        관리자 제목 <span className="text-red-500">*</span>
        <span className="ml-1 text-xs font-normal text-neutral-400">(사용자에게 노출되지 않습니다)</span>
      </label>
      <input
        {...inputProps}
        placeholder={placeholder}
        maxLength={200}
        className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
          focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── 타입(IMAGE/HTML) 선택 ────────────────────────────
export type PromoContentType = 'IMAGE' | 'HTML'

export function PromoTypeField({ label, isEdit, value, onChange }: {
  label: string; isEdit: boolean; value: PromoContentType; onChange: (t: PromoContentType) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        {label} <span className="text-red-500">*</span>
        {isEdit && <span className="ml-1 text-xs font-normal text-neutral-400">(수정 불가)</span>}
      </label>
      <div className="flex gap-3">
        {(['IMAGE', 'HTML'] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={isEdit}
            onClick={() => !isEdit && onChange(t)}
            className={[
              'flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all',
              isEdit ? 'cursor-default opacity-75' : 'cursor-pointer',
              value === t
                ? 'border-primary-500 bg-primary-50 text-primary-900'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-300',
            ].join(' ')}
          >
            {t === 'IMAGE' ? '🖼 이미지형' : '📝 HTML형'}
            <p className="text-xs font-normal mt-0.5 opacity-70">
              {t === 'IMAGE' ? '클릭 가능한 이미지 배너' : 'TipTap 리치 텍스트'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 언어(KO/EN) 선택 ─────────────────────────────────
export function PromoLanguageField({ isEdit, value, onChange }: {
  isEdit: boolean; value: 'KO' | 'EN'; onChange: (l: 'KO' | 'EN') => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        언어 <span className="text-red-500">*</span>
        {isEdit && <span className="ml-1 text-xs font-normal text-neutral-400">(수정 불가)</span>}
      </label>
      <div className="flex gap-3">
        {(['KO', 'EN'] as const).map((l) => (
          <label
            key={l}
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all',
              isEdit ? 'cursor-default opacity-75' : '',
              value === l
                ? 'border-primary-500 bg-primary-50 text-primary-900'
                : 'border-neutral-200 text-neutral-600',
            ].join(' ')}
          >
            <input
              type="radio"
              checked={value === l}
              onChange={() => !isEdit && onChange(l)}
              disabled={isEdit}
              className="accent-primary-800"
            />
            <span className="text-sm font-medium">{l === 'KO' ? '🇰🇷 한국어' : '🇺🇸 English'}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── 링크 URL + 새 탭 체크박스 ────────────────────────
export function PromoLinkUrlField({ inputProps, error }: {
  inputProps: UseFormRegisterReturn; error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        링크 URL <span className="text-xs font-normal text-neutral-400">(선택)</span>
      </label>
      <input
        {...inputProps}
        placeholder="https://example.com"
        className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
          focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function NewTabCheckbox({ checked, onChange }: {
  checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-primary-800 rounded"
      />
      <span className="text-sm text-neutral-700">새 탭에서 열기</span>
    </label>
  )
}

// ─── 이미지 업로드 드롭존 ─────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTS   = ['jpg', 'jpeg', 'png', 'gif', 'webp']

export interface UploadedImageLike {
  imageUrl: string
  originalFileName: string
}

interface PromoImageDropzoneProps {
  /** 헤더 라벨 (생략 시 헤더 미표시 — 페이지에서 별도 라벨 사용) */
  label?: string
  hint?: string
  required?: boolean
  alt: string
  /** 드롭존 높이 클래스 (기본 h-40) */
  heightClass?: string
  /** 미리보기 이미지 최대 높이 클래스 (기본 max-h-64) */
  previewClass?: string
  dropText?: string
  /** 드롭존 안내 줄 (형식·크기 등) */
  dropHints?: string[]
  uploadedImage: UploadedImageLike | null
  existingImageUrl: string | null
  onUpload: (file: File) => Promise<void> | void
  onRemove: () => void
  isUploading: boolean
  error?: string
  /** 확장자·크기 외 추가 검증 — 에러 메시지를 반환하면 alert 후 업로드 중단 */
  validateFile?: (file: File) => Promise<string | null>
}

export function PromoImageDropzone({
  label, hint, required, alt,
  heightClass = 'h-40',
  previewClass = 'max-h-64',
  dropText = '이미지를 드래그하거나 클릭하여 업로드',
  dropHints = ['JPG · PNG · GIF · WEBP, 최대 10MB'],
  uploadedImage, existingImageUrl, onUpload, onRemove, isUploading, error, validateFile,
}: PromoImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const displayUrl = uploadedImage?.imageUrl ?? existingImageUrl

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTS.includes(ext)) {
      alert('JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다. (SVG 불가)')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      alert('이미지 크기는 10MB 이하여야 합니다.')
      return
    }
    if (validateFile) {
      const message = await validateFile(file)
      if (message) {
        alert(message)
        return
      }
    }
    onUpload(file)
  }

  return (
    <div>
      {label && (
        <p className="text-sm font-medium text-neutral-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {hint && <span className="ml-1 text-xs font-normal text-neutral-400">{hint}</span>}
        </p>
      )}

      {displayUrl ? (
        <div className="relative inline-block">
          <img src={displayUrl} alt={alt} className={`${previewClass} rounded-lg border border-neutral-200 block`} />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs
              flex items-center justify-center hover:bg-red-600 transition-colors shadow"
          >
            ×
          </button>
          {uploadedImage && (
            <p className="mt-1 text-xs text-neutral-500">{uploadedImage.originalFileName}</p>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false)
            const f = e.dataTransfer.files[0]; if (f) handleFile(f)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={[
            `flex flex-col items-center justify-center ${heightClass} rounded-lg border-2 border-dashed`,
            'cursor-pointer transition-colors',
            isDragging ? 'border-primary-400 bg-primary-50' : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50',
            error ? 'border-red-400' : '',
          ].join(' ')}
        >
          {isUploading ? (
            <p className="text-sm text-neutral-500">업로드 중...</p>
          ) : (
            <>
              <svg className="w-8 h-8 text-neutral-400 mb-2" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-sm text-neutral-500">{dropText}</p>
              {dropHints.map((line, i) => (
                <p key={line} className={`text-xs text-neutral-400 ${i === 0 ? 'mt-1' : 'mt-0.5'}`}>{line}</p>
              ))}
            </>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}

// ─── 노출 설정 (노출 토글 + 상시 노출 + 게시 기간) ────
export function PromoScheduleFields({
  visibleLabel, visibleOnDescription, visibleOffDescription,
  isVisible, onVisibleChange,
  isAlwaysVisible, onAlwaysVisibleChange,
  startAtProps, endAtProps, startAt, startAtError, endAtError,
}: {
  visibleLabel: string
  visibleOnDescription: string
  visibleOffDescription: string
  isVisible: boolean
  onVisibleChange: (v: boolean) => void
  isAlwaysVisible: boolean
  onAlwaysVisibleChange: (v: boolean) => void
  startAtProps: UseFormRegisterReturn
  endAtProps: UseFormRegisterReturn
  startAt?: string
  startAtError?: string
  endAtError?: string
}) {
  return (
    <>
      <ToggleSwitch
        checked={isVisible}
        onChange={onVisibleChange}
        label={visibleLabel}
        description={isVisible ? visibleOnDescription : visibleOffDescription}
      />

      {/* 게시 기간 — 노출 ON일 때만 표시 */}
      {isVisible && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAlwaysVisible}
              onChange={(e) => onAlwaysVisibleChange(e.target.checked)}
              className="w-4 h-4 accent-primary-800 rounded"
            />
            <span className="text-sm font-medium text-neutral-700">상시 노출</span>
            <span className="text-xs text-neutral-400">(기간 설정 무시)</span>
          </label>

          {!isAlwaysVisible && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              노출하려면 <strong>상시 노출</strong>을 체크하거나 <strong>시작일시·종료일시</strong>를 모두 입력해야 합니다.
            </p>
          )}

          <div className={`grid grid-cols-2 gap-3 ${isAlwaysVisible ? 'opacity-40 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">시작일시</label>
              <input
                type="datetime-local"
                {...startAtProps}
                onChange={(e) => {
                  e.target.value = fixDatetimeYear(e.target.value)
                  startAtProps.onChange(e)
                }}
                max="9999-12-31T23:59"
                disabled={isAlwaysVisible}
                className="w-full h-9 px-2 text-sm border border-neutral-300 rounded-lg
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none
                  disabled:bg-neutral-100"
              />
              {startAtError && <p className="mt-1 text-xs text-red-600">{startAtError}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">종료일시</label>
              <input
                type="datetime-local"
                {...endAtProps}
                onChange={(e) => {
                  e.target.value = fixDatetimeYear(e.target.value)
                  endAtProps.onChange(e)
                }}
                max="9999-12-31T23:59"
                min={startAt || undefined}
                disabled={isAlwaysVisible}
                className="w-full h-9 px-2 text-sm border border-neutral-300 rounded-lg
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none
                  disabled:bg-neutral-100"
              />
              {endAtError && <p className="mt-1 text-xs text-red-600">{endAtError}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── 페이지 레이아웃 (좌: 입력 / 우: 미리보기·노출, PC 우측 고정) ─
export function TwoColumnFormLayout({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
      <div className="space-y-5">{left}</div>
      <div className="space-y-5 lg:sticky lg:top-6">{right}</div>
    </div>
  )
}

// ─── 액션 버튼 (취소/저장) ────────────────────────────
export function PromoFormActions({ onCancel, onSave, isPending }: {
  onCancel: () => void; onSave: () => void; isPending: boolean
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <Button variant="secondary" onClick={onCancel} disabled={isPending}>
        취소
      </Button>
      <div className="flex-1" />
      <Button variant="primary" isLoading={isPending} onClick={onSave}>
        저장
      </Button>
    </div>
  )
}

// ─── 로딩 플레이스홀더 ────────────────────────────────
export function PromoFormLoading() {
  return (
    <div className="p-8 flex items-center justify-center min-h-64">
      <div className="text-neutral-400 text-sm">불러오는 중...</div>
    </div>
  )
}
