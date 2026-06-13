package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;
import com.caskbycask.domain.spirit.entity.enums.WineType;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import com.caskbycask.domain.spirit.entity.enums.OtherSpiritType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
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
        @Schema(description = "숙성 연수 (선택, isNas=true 시 무시)")
        Integer ageStatement,
        @Schema(description = "NAS(숙성 연수 미표기) 여부 (선택)")
        Boolean isNas,
        @Schema(description = "증류 연월 (선택, YYYY 또는 YYYY-MM)")
        @Pattern(regexp = "^\\d{4}(-\\d{2})?$", message = "증류 연월 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM).")
        String distilledDate,
        @Schema(description = "병입 연월 (선택, YYYY 또는 YYYY-MM)")
        @Pattern(regexp = "^\\d{4}(-\\d{2})?$", message = "병입 연월 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM).")
        String bottledDate,
        @Schema(description = "출시일 (선택)")
        LocalDate releaseDate,
        @Schema(description = "위스키 스타일 (필수, 신청자 입력)")
        WhiskyStyle whiskyStyle,
        @Schema(description = "위스키 스타일 직접 입력 (whiskyStyle=OTHER 일 때 필수)")
        @Size(max = 100, message = "스타일 직접 입력은 100자 이하여야 합니다.")
        String whiskyStyleOther,
        @Schema(description = "캐스크 번호 (선택, 위스키)")
        @Size(max = 100, message = "캐스크 번호는 100자 이하여야 합니다.")
        String caskNo,
        @Schema(description = "기타 정보 (선택, 위스키 참고용 자유 입력)")
        @Size(max = 500, message = "기타 정보는 500자 이하여야 합니다.")
        String whiskyNotes,
        @Schema(description = "와인 종류 (필수, 신청자 입력)")
        WineType wineType,
        @Schema(description = "꼬냑 등급 (필수, 신청자 입력)")
        CognacGrade cognacGrade,
        @Schema(description = "기타 주종 (필수, 신청자 입력)")
        OtherSpiritType otherType,
        @Schema(description = "이미지 URL 목록 (선택)")
        List<String> imageUrls,
        @Schema(description = "관리자에게 전달할 기타 문구 (선택, 최대 500자)")
        @Size(max = 500, message = "기타 문구는 500자 이하로 입력해주세요.")
        String note
) {
        /**
         * 카테고리별 핵심값(스타일/종류/등급/주종) 필수 여부.
         * 신청자 직접 제출/수정 경로에서만 호출 — 관리자 수정(핵심값 미전송)에는 적용하지 않음.
         */
        public boolean hasCategoryCore() {
                if (category == null) return false;
                return switch (category) {
                        case WHISKY -> whiskyStyle != null
                                && (whiskyStyle != WhiskyStyle.OTHER
                                        || (whiskyStyleOther != null && !whiskyStyleOther.isBlank()));
                        case WINE   -> wineType != null;
                        case COGNAC -> cognacGrade != null;
                        case OTHER  -> otherType != null;
                };
        }
}
