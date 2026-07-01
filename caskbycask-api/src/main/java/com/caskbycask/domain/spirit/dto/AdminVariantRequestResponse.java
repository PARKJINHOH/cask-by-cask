package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

public record AdminVariantRequestResponse(
        @Schema(description = "하위 에디션 ID")
        Long id,
        @Schema(description = "마스터 주류 ID")
        Long masterId,
        @Schema(description = "마스터 한글명")
        String masterNameKo,
        @Schema(description = "마스터 영문명")
        String masterNameEn,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "에디션 유형")
        VariantType variantType,
        @Schema(description = "에디션 식별 값")
        String variantValue,
        @Schema(description = "에디션 식별 값(영문)")
        String variantValueEn,
        @Schema(description = "공유 시리즈 식별자")
        String seriesIdentifier,
        @Schema(description = "공유 시리즈 식별자(영문)")
        String seriesIdentifierEn,
        @Schema(description = "상태")
        SpiritStatus status,
        @Schema(description = "신청자 ID")
        Long requesterId,
        @Schema(description = "신청자 닉네임")
        String requesterNickname,
        @Schema(description = "신청일")
        LocalDateTime createdAt
) {
    public static AdminVariantRequestResponse from(Spirit variant) {
        Spirit master = variant.getParent();
        return new AdminVariantRequestResponse(
                variant.getId(),
                master != null ? master.getId() : null,
                master != null ? master.getNameKo() : variant.getNameKo(),
                master != null ? master.getNameEn() : variant.getNameEn(),
                variant.getCategory(),
                variant.getVariantType(),
                variant.getVariantValue(),
                variant.getVariantValueEn(),
                variant.getSeriesIdentifier(),
                variant.getSeriesIdentifierEn(),
                variant.getStatus(),
                variant.getRegisteredBy() != null ? variant.getRegisteredBy().getId() : null,
                variant.getRegisteredBy() != null ? variant.getRegisteredBy().getNickname() : null,
                variant.getCreatedAt()
        );
    }
}
