import { useCallback } from 'react'
import RichTextEditor from '@/shared/tiptap/RichTextEditor'
import { noticeApi } from '../api/noticeApi'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

interface Props {
  value: string
  onChange: (html: string) => void
  onImageUploadError?: (message: string) => void
  placeholder?: string
  /** 호출처별 이미지 업로드 백엔드 주입(없으면 공지 업로드 사용) */
  uploadImage?: (file: File) => Promise<string | null>
}

// 공지/관리자 콘텐츠 에디터 — 공용 RichTextEditor 에 공지 업로드 백엔드를 주입한 얇은 래퍼.
export default function NoticeEditor({ value, onChange, onImageUploadError, placeholder, uploadImage }: Props) {
  const handleUploadImage = useCallback(
    async (file: File, onProgress?: (p: number) => void): Promise<string | null> => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        onImageUploadError?.('JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다.')
        return null
      }
      try {
        if (uploadImage) return await uploadImage(file)
        const res = await noticeApi.uploadImage(file, onProgress)
        return res.data.data?.imageUrl ?? null
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        onImageUploadError?.(
          status === 429
            ? '이미지 업로드 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'
            : '이미지 업로드 중 오류가 발생했습니다.',
        )
        return null
      }
    },
    [uploadImage, onImageUploadError],
  )

  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? '공지 내용을 입력하세요...'}
      maxChars={50000}
      uploadImage={handleUploadImage}
      onImageError={onImageUploadError}
      enableSpiritEmbed
    />
  )
}
