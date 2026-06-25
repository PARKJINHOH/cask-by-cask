package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record CreateSpiritRequest(

        @Schema(description = "한글 제품명")
        @NotBlank(message = "한글 이름은 필수입니다.")
        @Size(max = 200, message = "한글 이름은 200자 이하여야 합니다.") String nameKo,

        @Schema(description = "영문 제품명")
        @NotBlank(message = "영문 이름은 필수입니다.")
        @Size(max = 200, message = "영문 이름은 200자 이하여야 합니다.") String nameEn,

        @Schema(description = "카테고리 (WHISKY, COGNAC, WINE, OTHER)")
        @NotNull(message = "카테고리는 필수입니다.") SpiritCategory category,

        @Schema(description = "증류소 ID (선택)")
        Long producerId,

        @Schema(description = "병입업체명 (독립 병입인 경우)")
        @Size(max = 200, message = "병입업체명은 200자 이하여야 합니다.")
        String bottler,

        @Schema(description = "병입 연도")
        @Min(value = 1800, message = "병입 연도는 1800년 이후여야 합니다.")
        @Max(value = 2100, message = "병입 연도는 2100년 이하여야 합니다.")
        Integer bottledYear,

        @Schema(description = "빈티지 연도 (원액 수확 연도)")
        @Min(value = 1800, message = "빈티지 연도는 1800년 이후여야 합니다.")
        @Max(value = 2100, message = "빈티지 연도는 2100년 이하여야 합니다.")
        Integer vintageYear,

        @Schema(description = "알코올 도수 % (0.0~100.0)")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,

        @Schema(description = "용량 ml")
        @Min(value = 1, message = "용량은 1ml 이상이어야 합니다.")
        @Max(value = 100000, message = "용량은 100000ml 이하여야 합니다.")
        Integer volumeMl,

        @Schema(description = "생산 국가")
        @Size(max = 100, message = "생산 국가는 100자 이하여야 합니다.")
        String country,

        @Schema(description = "생산 지역")
        @Size(max = 100, message = "생산 지역은 100자 이하여야 합니다.")
        String region,

        @Schema(description = "공통 상세 정보 (모든 카테고리)")
        @Valid SpiritCommonDetailRequest commonDetail,

        @Schema(description = "위스키 상세 (category=WHISKY 일 때)")
        @Valid WhiskyDetailRequest whiskyDetail,

        @Schema(description = "와인 상세 (category=WINE 일 때)")
        @Valid WineDetailRequest wineDetail,

        @Schema(description = "꼬냑 상세 (category=COGNAC 일 때)")
        @Valid CognacDetailRequest cognacDetail,

        @Schema(description = "기타 상세 (category=OTHER 일 때)")
        @Valid OtherDetailRequest otherDetail,

        @Schema(description = "하위 에디션 분리 등록 여부")
        Boolean isVariantSplit,

        @Schema(description = "하위 에디션 목록")
        @Valid List<CreateVariantRequest> variants,

        @Schema(description = "에디션 유형")
        VariantType variantType,

        @Schema(description = "에디션 식별 값")
        @Size(max = 100, message = "에디션 식별 값은 100자 이하여야 합니다.")
        String variantValue,

        @Schema(description = "에디션 식별 값(영문)")
        @Size(max = 100, message = "에디션 식별 값(영문)은 100자 이하여야 합니다.")
        String variantValueEn,

        @Schema(description = "최소 도수")
        @DecimalMin(value = "0.0", message = "최소 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최소 도수는 100.0 이하이어야 합니다.")
        BigDecimal abvMin,

        @Schema(description = "최대 도수")
        @DecimalMin(value = "0.0", message = "최대 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최대 도수는 100.0 이하이어야 합니다.")
        BigDecimal abvMax,

        @Schema(description = "최소 용량")
        @Min(value = 1, message = "최소 용량은 1ml 이상이어야 합니다.")
        @Max(value = 100000, message = "최소 용량은 100000ml 이하여야 합니다.")
        Integer volumeMlMin,

        @Schema(description = "최대 용량")
        @Min(value = 1, message = "최대 용량은 1ml 이상이어야 합니다.")
        @Max(value = 100000, message = "최대 용량은 100000ml 이하여야 합니다.")
        Integer volumeMlMax,

        @Schema(description = "노출 상태 (ACTIVE, HIDDEN, PENDING)")
        SpiritStatus status
) {}
