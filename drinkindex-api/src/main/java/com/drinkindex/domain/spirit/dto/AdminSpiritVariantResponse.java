package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.SpiritCommonDetail;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * 관리자용 연관 술 목록 항목.
 * 공개 {@link SpiritVariantResponse} 에 연결 출처(origin)와 상태(status)를 추가해 관리 화면에서 구분/제거할 수 있게 한다.
 */
public record AdminSpiritVariantResponse(
        @Schema(description = "술 고유 ID")
        Long id,
        @Schema(description = "한글 제품명")
        String nameKo,
        @Schema(description = "영문 제품명")
        String nameEn,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "병입년도")
        Integer bottledYear,
        @Schema(description = "빈티지")
        Integer vintageYear,
        @Schema(description = "알코올 도수 %")
        BigDecimal abv,
        @Schema(description = "용량 ml")
        Integer volumeMl,
        @Schema(description = "배치 번호")
        String batchNo,
        @Schema(description = "병입 연월 (YYYY-MM)")
        String bottledDate,
        @Schema(description = "대표 이미지 URL")
        String primaryImageUrl,
        @Schema(description = "공개 상태 (ACTIVE, HIDDEN, PENDING)")
        SpiritStatus status,
        @Schema(description = "연결 출처: AUTO(이름 자동) / MANUAL(수동 추가)")
        String origin
) {
    public static AdminSpiritVariantResponse of(Spirit spirit, String primaryImageUrl, String origin) {
        SpiritCommonDetail cd = spirit.getCommonDetail();
        return new AdminSpiritVariantResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getBottledYear(),
                spirit.getVintageYear(),
                spirit.getAbv(),
                spirit.getVolumeMl(),
                cd != null ? cd.getBatchNo() : null,
                cd != null ? cd.getBottledDate() : null,
                primaryImageUrl,
                spirit.getStatus(),
                origin
        );
    }
}
