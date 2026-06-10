import { useCallback } from 'react'
import RichTextEditor from '@/shared/tiptap/RichTextEditor'
import { communityApi } from '../api/communityApi'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  onImageError?: (msg: string) => void
  onVideoError?: (msg: string) => void
}

// 커뮤니티 게시글 에디터 — 공용 RichTextEditor 에 커뮤니티 업로드 백엔드를 주입한 얇은 래퍼.
export default function PostEditor({ value, onChange, placeholder, onImageError, onVideoError }: Props) {
  const uploadImage = useCallback(async (file: File, onProgress?: (p: number) => void) => {
    const res = await communityApi.uploadPostImage(file, onProgress)
    return res.data.data?.imageUrl ?? null
  }, [])

  const uploadVideo = useCallback(async (file: File, onProgress?: (p: number) => void) => {
    const res = await communityApi.uploadPostVideo(file, onProgress)
    const data = res.data.data
    return data ? { videoUrl: data.videoUrl, mimeType: data.mimeType } : null
  }, [])

  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? '내용을 입력하세요...'}
      maxChars={100000}
      uploadImage={uploadImage}
      uploadVideo={uploadVideo}
      onImageError={onImageError}
      onVideoError={onVideoError}
      enableSpiritEmbed
    />
  )
}
