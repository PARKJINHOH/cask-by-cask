package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.SpiritCommonDetail;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SpiritCommonDetailResponse(

        @Schema(description = "NAS 여부")
        Boolean isNas,

        @Schema(description = "숙성 연수 (isNas=true면 null)")
        Integer ageStatement,

        @Schema(description = "최소 숙성 연수")
        Integer ageStatementMin,

        @Schema(description = "최대 숙성 연수")
        Integer ageStatementMax,

        @Schema(description = "증류 연월 (YYYY 또는 YYYY-MM)")
        String distilledDate,

        @Schema(description = "병입 연월 (YYYY 또는 YYYY-MM)")
        String bottledDate,

        @Schema(description = "출시일")
        LocalDate releaseDate,

        @Schema(description = "용량 ml")
        Integer volumeMl,

        @Schema(description = "알코올 도수 %")
        BigDecimal abv,

        @Schema(description = "병 번호")
        String bottleNo,

        @Schema(description = "배치 번호")
        String batchNo,

        @Schema(description = "총 병 수")
        Integer totalBottles

) {
    public static SpiritCommonDetailResponse from(SpiritCommonDetail detail) {
        if (detail == null) return null;
        boolean isNas = Boolean.TRUE.equals(detail.getIsNas());
        return new SpiritCommonDetailResponse(
                detail.getIsNas(),
                isNas ? null : detail.getAgeStatement(),
                isNas ? null : detail.getAgeStatementMin(),
                isNas ? null : detail.getAgeStatementMax(),
                detail.getDistilledDate(),
                detail.getBottledDate(),
                detail.getReleaseDate(),
                detail.getVolumeMl(),
                detail.getAbv(),
                detail.getBottleNo(),
                detail.getBatchNo(),
                detail.getTotalBottles()
        );
    }
}
