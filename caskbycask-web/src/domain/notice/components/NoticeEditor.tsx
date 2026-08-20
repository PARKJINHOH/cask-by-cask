import { useCallback } from 'react'
import RichTextEditor from '@/shared/tiptap/RichTextEditor'
import { extractApiErrorCode } from '@/shared/utils/apiError'
import { resolveUploadErrorReason } from '@/shared/utils/uploadError'
import { noticeApi } from '../api/noticeApi'

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
      // 확장자로 미리 막지 않는다 — 메신저를 거쳐 이름만 .png 로 바뀐 JPEG, 확장자 없는 스크린샷도
      // 서버가 파일 내용(Magic Bytes)으로 판정해 받아 준다(NoticeImageValidator).
      try {
        if (uploadImage) return await uploadImage(file)
        const res = await noticeApi.uploadImage(file, onProgress)
        return res.data.data?.imageUrl ?? null
      } catch (error: unknown) {
        // 관리자 화면이라 에러코드까지 붙인다 — 문의가 들어왔을 때 로그와 바로 대조할 수 있다.
        const reason = resolveUploadErrorReason(error, {
          network: '서버에 연결하지 못했습니다. 네트워크 상태를 확인해주세요.',
          auth: '이미지를 업로드할 권한이 없습니다. 다시 로그인해주세요.',
          tooLarge: '업로드 용량 제한을 초과했습니다.',
          rateLimited: '이미지 업로드 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.',
          server: '서버에서 이미지를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
        })
        const code = extractApiErrorCode(error)
        onImageUploadError?.(`${file.name} 업로드 실패 — ${reason}${code ? ` (${code})` : ''}`)
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
