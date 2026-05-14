package com.drinkindex.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SpiritCommonDetailRequest(

        @Schema(description = "NAS(No Age Statement) 여부")
        Boolean isNas,

        @Schema(description = "숙성 연수 (isNas=true 시 서버에서 강제 null 처리)")
        Integer ageStatement,

        @Schema(description = "증류 연월 (YYYY 또는 YYYY-MM)")
        @Pattern(regexp = "^\\d{4}(-\\d{2})?$", message = "날짜 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM).")
        String distilledDate,

        @Schema(description = "병입 연월 (YYYY 또는 YYYY-MM)")
        @Pattern(regexp = "^\\d{4}(-\\d{2})?$", message = "날짜 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM).")
        String bottledDate,

        @Schema(description = "출시일")
        LocalDate releaseDate,

        @Schema(description = "용량 (ml)")
        @Min(value = 1, message = "용량은 1ml 이상이어야 합니다.")
        @Max(value = 100000, message = "용량은 100,000ml 이하이어야 합니다.")
        Integer volumeMl,

        @Schema(description = "알코올 도수 %")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,

        @Schema(description = "병 번호 (예: 123/500)")
        @Size(max = 50, message = "병 번호는 50자 이하여야 합니다.")
        String bottleNo,

        @Schema(description = "배치 번호")
        @Size(max = 100, message = "배치 번호는 100자 이하여야 합니다.")
        String batchNo,

        @Schema(description = "총 병 수")
        @Min(value = 1, message = "총 병 수는 1 이상이어야 합니다.")
        Integer totalBottles

) {
        /** isNas=true일 때 ageStatement가 null이어야 함 */
        @AssertTrue(message = "NAS 체크 시 숙성 연수를 입력할 수 없습니다.")
        public boolean isAgeStatementValidForNas() {
                return !Boolean.TRUE.equals(isNas) || ageStatement == null;
        }
}
