import { useState } from 'react'
import ScoreInput from '@/shared/components/ScoreInput'
import Button from '@/shared/components/Button'
import { useCreateReview, useUpdateReview } from '../hooks/useReviews'
import type { ReviewItem } from '../types/review.types'

export interface ReviewFormProps {
  spiritId: number
  editingReview?: ReviewItem
  onSuccess: () => void
  onCancel: () => void
}

export default function ReviewForm({
  spiritId,
  editingReview,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [noseScore, setNoseScore]   = useState(editingReview?.noseScore ?? 70)
  const [tasteScore, setTasteScore] = useState(editingReview?.tasteScore ?? 70)
  const [finishScore, setFinishScore] = useState(editingReview?.finishScore ?? 70)
  const [comment, setComment]       = useState(editingReview?.comment ?? '')
  const [error, setError]           = useState('')

  const createMutation = useCreateReview(spiritId)
  const updateMutation = useUpdateReview(spiritId)
  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const data = {
      noseScore,
      tasteScore,
      finishScore,
      comment: comment.trim() || undefined,
    }
    try {
      if (editingReview) {
        await updateMutation.mutateAsync({ reviewId: editingReview.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '저장 중 오류가 발생했습니다.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-5"
    >
      <h3 className="text-sm font-semibold text-neutral-700">
        {editingReview ? '리뷰 수정' : '리뷰 작성'}
      </h3>

      <ScoreInput label="향 (Nose)"    value={noseScore}   onChange={setNoseScore} />
      <ScoreInput label="맛 (Taste)"   value={tasteScore}  onChange={setTasteScore} />
      <ScoreInput label="피니시 (Finish)" value={finishScore} onChange={setFinishScore} />

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          코멘트 <span className="text-neutral-400 font-normal">(선택)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="이 술에 대한 생각을 남겨주세요..."
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none
            focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
            placeholder:text-neutral-400"
        />
        <p className="text-xs text-neutral-400 text-right mt-0.5">{comment.length}/500</p>
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
          취소
        </Button>
        <Button size="sm" type="submit" isLoading={isPending}>
          {editingReview ? '수정 완료' : '리뷰 등록'}
        </Button>
      </div>
    </form>
  )
}
