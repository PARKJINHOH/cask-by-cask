import type { AdminSpiritImageItem } from '@/domain/admin/types/admin.types'

interface Props {
  /** 이 에디션에 지정된 이미지들. 지정은 위쪽 「이미지」 카드에서 한다 */
  images: AdminSpiritImageItem[]
  /** 아직 저장 전인 신규 에디션 */
  unsaved?: boolean
}

/**
 * 에디션 탭의 읽기 전용 이미지 미리보기.
 *
 * <p>이미지 업로드·편집·삭제는 전부 위쪽 「이미지」 카드가 갖고 있다. 여기서는 관리자가
 * "이 에디션에 뭐가 붙었는지"만 바로 확인할 수 있으면 된다.
 */
export default function VariantAssignedImagesPreview({ images, unsaved = false }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-neutral-500">
        지정된 이미지
        <span className="ml-1.5 font-normal text-neutral-400">
          위 「이미지」 카드에서 지정합니다 (한 이미지를 여러 에디션이 함께 쓸 수 있습니다)
        </span>
      </label>

      {unsaved ? (
        <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-2 text-center text-[10px] leading-tight text-neutral-400">
          저장 후<br />지정 가능
        </div>
      ) : images.length === 0 ? (
        <div className="flex h-20 items-center rounded-xl border border-dashed border-neutral-200 bg-white px-3 text-[11px] text-neutral-400">
          지정된 이미지가 없습니다. 지정하지 않으면 공통 이미지가 보입니다.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="h-20 w-20 overflow-hidden rounded-xl border border-neutral-200 bg-white"
            >
              <img src={img.imageUrl} alt="" className="h-full w-full object-contain p-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
