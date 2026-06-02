package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.WhiskyStyle;
import com.drinkindex.domain.spirit.entity.enums.WineType;
import com.drinkindex.domain.spirit.entity.enums.CognacGrade;
import com.drinkindex.domain.spirit.entity.enums.OtherSpiritType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record SpiritRegisterRequestBody(
        @Schema(description = "한글 제품명")
        @NotBlank(message = "한글 이름은 필수입니다.") String nameKo,
        @Schema(description = "영문 제품명")
        @NotBlank(message = "영문 이름은 필수입니다.") String nameEn,
        @Schema(description = "카테고리 (WHISKY, COGNAC, WINE 등)")
        @NotNull(message = "카테고리는 필수입니다.") SpiritCategory category,
        @Schema(description = "증류소 ID (선택)")
        Long producerId,
        @Schema(description = "병입업체명 (선택)")
        String bottler,
        @Schema(description = "병입 연도 (선택)")
        Integer bottledYear,
        @Schema(description = "빈티지 연도 (선택)")
        Integer vintageYear,
        @Schema(description = "알코올 도수 % (0.0~100.0)")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,
        @Schema(description = "용량 ml (선택)")
        Integer volumeMl,
        @Schema(description = "생산 국가 (선택)")
        String country,
        @Schema(description = "생산 지역 (선택)")
        String region,
        @Schema(description = "위스키 스타일 (선택, 신청자 입력)")
        WhiskyStyle whiskyStyle,
        @Schema(description = "와인 종류 (선택, 신청자 입력)")
        WineType wineType,
        @Schema(description = "꼬냑 등급 (선택, 신청자 입력)")
        CognacGrade cognacGrade,
        @Schema(description = "기타 주종 (선택, 신청자 입력)")
        OtherSpiritType otherType,
        @Schema(description = "이미지 URL 목록 (선택)")
        List<String> imageUrls
) {}
