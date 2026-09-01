import { useEffect, useState } from 'react'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import { useAssignSpiritImageVariants } from '@/domain/admin/hooks/useAdminSpirits'
import type { AdminSpiritImageItem, AdminSpiritVariant } from '@/domain/admin/types/admin.types'

interface Props {
  open: boolean
  onClose: () => void
  /** 이미지를 등록한 주류(마스터) ID */
  spiritId: number
  image: AdminSpiritImageItem
  variants: AdminSpiritVariant[]
  onError: (message: string) => void
}

/** 에디션 이름 — 식별 값이 비어 있는 예전 데이터는 ID 로라도 구분할 수 있게 한다. */
export function variantLabel(variant: AdminSpiritVariant) {
  return variant.variantValue?.trim() || variant.variantValueEn?.trim() || `#${variant.id}`
}

/**
 * 이미지 한 장에 적용할 에디션을 고르는 모달.
 *
 * <p>여러 에디션이 같은 라벨 디자인을 쓰는 일이 흔하다. 에디션마다 같은 파일을 올리는 대신
 * 이미지는 한 번만 올리고 여기서 쓸 에디션을 모두 체크한다.
 */
export default function SpiritImageEditionsModal({
  open, onClose, spiritId, image, variants, onError,
}: Props) {
  const assign = useAssignSpiritImageVariants()
  const [selected, setSelected] = useState<number[]>([])

  // 모달을 열 때마다 서버 상태로 초기화한다 — 취소했다가 다시 열면 이전 편집이 남으면 안 된다.
  useEffect(() => {
    if (open) setSelected((image.variants ?? []).map((ref) => ref.spiritId))
  }, [open, image.variants])

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    try {
      await assign.mutateAsync({ id: spiritId, imageId: image.id, variantIds: selected })
      onClose()
    } catch {
      onError('에디션 지정에 실패했습니다.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="이 이미지를 쓰는 에디션"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={assign.isPending}>취소</Button>
          <Button onClick={handleSave} isLoading={assign.isPending}>저장</Button>
        </div>
      }
    >
      <div className="flex gap-4">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <img src={image.imageUrl} alt="" className="h-full w-full object-contain p-1" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-neutral-400">
              선택한 에디션에서 이 이미지가 대표로 보입니다. 아무것도 고르지 않으면 공통 이미지가 됩니다.
            </p>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setSelected(variants.map((v) => v.id))}
                className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-500 hover:border-amber-400 hover:text-amber-700"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-500 hover:border-amber-400 hover:text-amber-700"
              >
                전체 해제
              </button>
            </div>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {variants.map((variant) => (
              <label
                key={variant.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(variant.id)}
                  onChange={() => toggle(variant.id)}
                  className="h-4 w-4 accent-amber-600"
                />
                <span className="truncate text-neutral-700">{variantLabel(variant)}</span>
                {variant.status !== 'ACTIVE' && (
                  <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                    {variant.status === 'HIDDEN' ? '숨김' : '대기'}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
