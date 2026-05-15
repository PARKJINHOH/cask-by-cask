import { useParams } from 'react-router-dom'

// TODO: 게시글 작성/수정 폼 구현 예정
export default function PostFormPage() {
  const { id } = useParams()
  const isEdit = !!id

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">
        {isEdit ? '게시글 수정' : '글쓰기'}
      </h1>
      <div className="py-20 text-center text-neutral-400 text-sm border border-dashed border-neutral-300 rounded-xl">
        게시글 작성 폼 준비 중
      </div>
    </div>
  )
}
