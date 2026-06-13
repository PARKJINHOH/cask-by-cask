import { useRef, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe, useUploadProfileImage, useDeleteProfileImage } from '../hooks/useUser'
import Button from '@/shared/components/Button'
import DefaultAvatar from '@/shared/components/DefaultAvatar'

const PROFILE_IMAGE_LOCK_DAYS = 30
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const OUTPUT_SIZE = 300 // canvas 출력 크기 (px)

function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas context error')); return }
      ctx.drawImage(img, x, y, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('blob error')) },
        'image/jpeg',
        0.9,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load error')) }
    img.src = url
  })
}

export default function ProfileImageSection() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const uploadMutation = useUploadProfileImage()
  const deleteMutation = useDeleteProfileImage()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [croppedFile, setCroppedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { canChange, daysLeft } = useMemo(() => {
    if (!profile?.profileImageChangedAt) return { canChange: true, daysLeft: 0 }
    const changedAt = new Date(profile.profileImageChangedAt)
    const unlockDate = new Date(changedAt)
    unlockDate.setDate(unlockDate.getDate() + PROFILE_IMAGE_LOCK_DAYS)
    const now = new Date()
    if (unlockDate <= now) return { canChange: true, daysLeft: 0 }
    const daysLeft = Math.ceil((unlockDate.getTime() - now.getTime()) / 86_400_000)
    return { canChange: false, daysLeft }
  }, [profile?.profileImageChangedAt])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null)
    setPreviewUrl(null)
    setCroppedFile(null)

    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError(t('mypage.profileImage.invalidFormat'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setValidationError(t('mypage.profileImage.sizeExceeded'))
      return
    }

    try {
      const blob = await cropToSquare(file)
      const croppedFile = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setCroppedFile(croppedFile)
    } catch {
      setValidationError(t('mypage.profileImage.invalidFormat'))
    }
  }, [t])

  const handleSave = useCallback(async () => {
    if (!croppedFile) return
    try {
      await uploadMutation.mutateAsync(croppedFile)
      setPreviewUrl(null)
      setCroppedFile(null)
    } catch {
      // 에러는 mutation.error로 처리
    }
  }, [croppedFile, uploadMutation])

  const handleCancel = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setCroppedFile(null)
    setValidationError(null)
  }, [previewUrl])

  const handleDelete = useCallback(async () => {
    await deleteMutation.mutateAsync()
    setShowDeleteConfirm(false)
  }, [deleteMutation])

  const currentImageUrl = profile?.profileImageUrl
  const nickname = profile?.nickname ?? ''
  const avatarSeed = String(profile?.id ?? nickname ?? '?')
  const isUploading = uploadMutation.isPending
  const isDeleting = deleteMutation.isPending

  return (
    <div className="p-5 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-800">
        {t('mypage.profileImage.section')}
      </h3>

      <div className="flex items-center gap-5">
        {/* 현재 이미지 or 기본 아바타 */}
        <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-primary-100
          flex items-center justify-center text-2xl font-bold text-primary-800 select-none border
          border-neutral-200">
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt={nickname}
              className="w-full h-full object-cover"
            />
          ) : (
            <DefaultAvatar seed={avatarSeed} px={42} />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canChange || isUploading || isDeleting}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-primary-500
                text-primary-800 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors"
            >
              {t('mypage.profileImage.change')}
            </button>
            {currentImageUrl && !previewUrl && (
              <button
                type="button"
                disabled={isDeleting || isUploading}
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300
                  text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors"
              >
                {t('mypage.profileImage.delete')}
              </button>
            )}
          </div>

          {!canChange && (
            <p className="text-xs text-amber-600">
              {t('mypage.profileImage.changeLock', { days: daysLeft })}
            </p>
          )}
          {!previewUrl && (
            <p className="text-xs text-neutral-400">
              {t('mypage.profileImage.hint')}
            </p>
          )}
        </div>
      </div>

      {/* 파일 입력 (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 유효성 에러 */}
      {validationError && (
        <p className="text-sm text-red-500">{validationError}</p>
      )}

      {/* 크롭 미리보기 */}
      {previewUrl && (
        <div className="flex flex-col items-center gap-4 pt-2">
          <p className="text-sm text-neutral-500 font-medium self-start">
            {t('mypage.profileImage.preview')}
          </p>
          <img
            src={previewUrl}
            alt="preview"
            className="w-24 h-24 rounded-full object-cover border-2 border-primary-200 shadow"
          />
          {uploadMutation.isError && (
            <p className="text-sm text-red-500">
              {t('mypage.profileImage.uploadError')}
            </p>
          )}
          <div className="flex gap-3 self-start">
            <Button
              type="button"
              size="sm"
              isLoading={isUploading}
              onClick={handleSave}
            >
              {t('mypage.profileImage.save')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isUploading}
              onClick={handleCancel}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-700 font-medium">
            {t('mypage.profileImage.deleteConfirm')}
          </p>
          {deleteMutation.isError && (
            <p className="text-sm text-red-500">{t('mypage.profileImage.deleteError')}</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="danger"
              isLoading={isDeleting}
              onClick={handleDelete}
            >
              {t('mypage.profileImage.deleteBtn')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
