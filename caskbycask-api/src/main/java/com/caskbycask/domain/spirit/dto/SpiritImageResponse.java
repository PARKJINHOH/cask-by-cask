package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record SpiritImageResponse(
        @Schema(description = "이미지 고유 ID")
        Long id,
        @Schema(description = "이미지 URL")
        String imageUrl,
        @Schema(description = "대표 이미지 여부")
        Boolean isPrimary,
        @Schema(description = "이미지 정렬 순서 (낮을수록 앞에 표시)")
        Integer sortOrder,
        @Schema(description = "이미지를 등록한 주류 ID (보통 마스터)")
        Long spiritId,
        @Schema(description = "이 이미지를 쓰는 에디션 목록. 비어 있으면 공통 이미지 — 화면에 뱃지가 뜨지 않는다")
        List<VariantRef> variants
) {
    @Schema(description = "이미지에 지정된 에디션")
    public record VariantRef(
            @Schema(description = "에디션 주류 ID")
            Long spiritId,
            @Schema(description = "에디션 식별 값 (예: 배치 11 / 2015)")
            String variantValue,
            @Schema(description = "에디션 식별 값(영문). 없으면 null")
            String variantValueEn
    ) {}

    /**
     * 지정 목록까지 아는 경우.
     *
     * @param owner 이미지를 등록한 주류. 소유자 ID 를 프록시 초기화 없이 쓰려고 받는다.
     */
    public static SpiritImageResponse of(SpiritImage image, Spirit owner, List<VariantRef> variants) {
        return new SpiritImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getIsPrimary(),
                image.getSortOrder(),
                owner != null ? owner.getId() : ownerId(image),
                variants != null ? variants : List.of()
        );
    }

    /**
     * 지정 목록을 모르는 경우(업로드·등록 요청 응답 등) — 비워 둔다.
     *
     * <p>{@code image.getSpirit().getId()} 는 프록시 ID 접근이라 추가 쿼리가 없다.
     */
    public static SpiritImageResponse from(SpiritImage image) {
        return new SpiritImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getIsPrimary(),
                image.getSortOrder(),
                ownerId(image),
                List.of()
        );
    }

    /**
     * 에디션 주류 → 뱃지에 쓸 참조. 에디션 유형이 없거나 NONE 이면 null 을 돌려준다 —
     * 마스터·단독 주류는 뱃지에 띄울 식별 값이 없다.
     * 판정은 canonical slug 와 같은 규칙({@link SpiritSlugUtils#hasEdition})을 쓴다.
     */
    public static VariantRef variantRefOf(Spirit variant) {
        if (variant == null || !SpiritSlugUtils.hasEdition(variant.getVariantType())) {
            return null;
        }
        return new VariantRef(variant.getId(), variant.getVariantValue(), variant.getVariantValueEn());
    }

    private static Long ownerId(SpiritImage image) {
        return image.getSpirit() != null ? image.getSpirit().getId() : null;
    }
}
