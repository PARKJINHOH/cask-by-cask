package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WhiskyCaskType;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;
import com.caskbycask.domain.spirit.entity.enums.WineType;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import com.caskbycask.domain.spirit.entity.enums.OtherSpiritType;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record SpiritRegisterRequestBody(
        @Schema(description = "한글 제품명")
        @NotBlank(message = "한글 이름은 필수입니다.")
        @Size(max = 200, message = "한글 이름은 200자 이하여야 합니다.") String nameKo,
        @Schema(description = "영문 제품명")
        @NotBlank(message = "영문 이름은 필수입니다.")
        @Size(max = 200, message = "영문 이름은 200자 이하여야 합니다.") String nameEn,
        @Schema(description = "카테고리 (WHISKY, COGNAC, WINE 등)")
        @NotNull(message = "카테고리는 필수입니다.") SpiritCategory category,
        @Schema(description = "증류소 ID (선택)")
        Long producerId,
        @Schema(description = "병입업체명 (선택)")
        @Size(max = 200, message = "병입업체명은 200자 이하여야 합니다.")
        String bottler,
        @Schema(description = "병입 연도 (선택)")
        @Min(value = 1800, message = "병입 연도는 1800년 이후여야 합니다.")
        @Max(value = 2100, message = "병입 연도는 2100년 이하여야 합니다.")
        Integer bottledYear,
        @Schema(description = "빈티지 연도 (선택)")
        @Min(value = 1800, message = "빈티지 연도는 1800년 이후여야 합니다.")
        @Max(value = 2100, message = "빈티지 연도는 2100년 이하여야 합니다.")
        Integer vintageYear,
        @Schema(description = "알코올 도수 % (0.0~100.0)")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,
        @Schema(description = "용량 ml (선택)")
        @Min(value = 1, message = "용량은 1ml 이상이어야 합니다.")
        @Max(value = 100000, message = "용량은 100000ml 이하여야 합니다.")
        Integer volumeMl,
        @Schema(description = "최소 알코올 도수 % (선택, 범위 지정 시)")
        @DecimalMin(value = "0.0", message = "최소 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최소 도수는 100.0 이하이어야 합니다.")
        BigDecimal abvMin,
        @Schema(description = "최대 알코올 도수 % (선택, 범위 지정 시)")
        @DecimalMin(value = "0.0", message = "최대 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최대 도수는 100.0 이하이어야 합니다.")
        BigDecimal abvMax,
        @Schema(description = "생산 국가 (선택)")
        @Size(max = 100, message = "생산 국가는 100자 이하여야 합니다.")
        String country,
        @Schema(description = "생산 지역 (선택)")
        @Size(max = 100, message = "생산 지역은 100자 이하여야 합니다.")
        String region,
        @Schema(description = "숙성 연수 (선택, isNas=true 시 무시)")
        Integer ageStatement,
        @Schema(description = "숙성 개월 (선택, 0~11, isNas=true 시 무시)")
        @Min(value = 0, message = "숙성 개월은 0 이상이어야 합니다.")
        @Max(value = 11, message = "숙성 개월은 11 이하여야 합니다.")
        Integer ageStatementMonths,
        @Schema(description = "최소 숙성 연수 (선택, 범위 지정 시)")
        Integer ageStatementMin,
        @Schema(description = "범위 최소 숙성 개월 (선택, 0~11)")
        @Min(value = 0, message = "숙성 개월은 0 이상이어야 합니다.")
        @Max(value = 11, message = "숙성 개월은 11 이하여야 합니다.")
        Integer ageStatementMinMonths,
        @Schema(description = "최대 숙성 연수 (선택, 범위 지정 시)")
        Integer ageStatementMax,
        @Schema(description = "범위 최대 숙성 개월 (선택, 0~11)")
        @Min(value = 0, message = "숙성 개월은 0 이상이어야 합니다.")
        @Max(value = 11, message = "숙성 개월은 11 이하여야 합니다.")
        Integer ageStatementMaxMonths,
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
        @Schema(description = "병 번호 (선택, 예: 123/500)")
        @Size(max = 50, message = "병 번호는 50자 이하여야 합니다.")
        String bottleNo,
        @Schema(description = "배치 번호 (선택)")
        @Size(max = 100, message = "배치 번호는 100자 이하여야 합니다.")
        String batchNo,
        @Schema(description = "총 병 수 (선택)")
        @Min(value = 1, message = "총 병 수는 1 이상이어야 합니다.")
        Integer totalBottles,
        @Schema(description = "위스키 스타일 (필수, 신청자 입력)")
        WhiskyStyle whiskyStyle,
        @Schema(description = "위스키 스타일 직접 입력 (whiskyStyle=OTHER 일 때 필수)")
        @Size(max = 100, message = "스타일 직접 입력은 100자 이하여야 합니다.")
        String whiskyStyleOther,
        @Schema(description = "브랜드명 (선택, 위스키 — 증류소와 별개의 상업 브랜드)")
        @Size(max = 200, message = "브랜드명은 200자 이하여야 합니다.")
        String brandName,
        @Schema(description = "병입 구분 (선택, 위스키 — OB/IB)")
        @Size(max = 20, message = "병입 구분 값이 올바르지 않습니다.")
        String bottlingType,
        @Schema(description = "캐스크 번호 (선택, 위스키)")
        @Size(max = 100, message = "캐스크 번호는 100자 이하여야 합니다.")
        String caskNo,
        @Schema(description = "기타 정보 (선택, 위스키 참고용 자유 입력)")
        @Size(max = 500, message = "기타 정보는 500자 이하여야 합니다.")
        String whiskyNotes,
        @Schema(description = "사용된 캐스크 종류 (선택, 위스키, 복수 선택 가능)")
        List<WhiskyCaskType> caskTypes,
        @Schema(description = "피니시(추가 숙성) 캐스크 종류 (선택, 위스키 — caskTypes 의 부분집합)")
        List<WhiskyCaskType> caskFinishes,
        @Schema(description = "캐스크 직접 입력 (선택, caskTypes 에 OTHER 포함 시만 유효)")
        @Size(max = 200, message = "캐스크 직접 입력은 200자 이하여야 합니다.")
        String caskTypeOther,
        @Schema(description = "캐스크 상세 세부 정보 (선택, 대분류별 세부 명칭 리스트)")
        Map<WhiskyCaskType, List<String>> caskDetails,
        @Schema(description = "Non-Chill Filtered 여부 (선택, 위스키)")
        Boolean isNonChillFiltered,
        @Schema(description = "Natural Colour 여부 (선택, 위스키)")
        Boolean isNaturalColour,
        @Schema(description = "Single Cask 여부 (선택, 위스키)")
        Boolean isSingleCask,
        @Schema(description = "Cask Strength 여부 (선택, 위스키)")
        Boolean isCaskStrength,
        @Schema(description = "피팅 여부 (선택, 위스키 — 피트/이탄 사용)")
        Boolean isPeated,
        @Schema(description = "피트 강도 ppm (선택, 위스키)")
        @Min(value = 0, message = "phenolPpm은 0 이상이어야 합니다.")
        @Max(value = 300, message = "phenolPpm은 300 이하이어야 합니다.")
        Integer phenolPpm,
        @Schema(description = "최소 피트 강도 ppm (선택, 위스키)")
        @Min(value = 0, message = "phenolPpmMin은 0 이상이어야 합니다.")
        @Max(value = 300, message = "phenolPpmMin은 300 이하이어야 합니다.")
        Integer phenolPpmMin,
        @Schema(description = "최대 피트 강도 ppm (선택, 위스키)")
        @Min(value = 0, message = "phenolPpmMax은 0 이상이어야 합니다.")
        @Max(value = 300, message = "phenolPpmMax은 300 이하이어야 합니다.")
        Integer phenolPpmMax,
        @Schema(description = "와인 종류 (필수, 신청자 입력)")
        WineType wineType,
        @Schema(description = "꼬냑 등급 (필수, 신청자 입력)")
        CognacGrade cognacGrade,
        @Schema(description = "기타 주종 (필수, 신청자 입력)")
        OtherSpiritType otherType,
        @Schema(description = "와인 상세 (선택, category=WINE — 와인 전체 상세 보존용)")
        @Valid WineDetailRequest wineDetail,
        @Schema(description = "꼬냑 상세 (선택, category=COGNAC — 꼬냑 전체 상세 보존용)")
        @Valid CognacDetailRequest cognacDetail,
        @Schema(description = "기타 상세 (선택, category=OTHER — 기타 전체 상세 보존용)")
        @Valid OtherDetailRequest otherDetail,
        @Schema(description = "이미지 URL 목록 (선택)")
        List<String> imageUrls,
        @Schema(description = "관리자에게 전달할 기타 문구 (선택, 최대 500자)")
        @Size(max = 500, message = "기타 문구는 500자 이하로 입력해주세요.")
        String note,
        @Schema(description = "에디션 유형 (선택, 위스키 — NONE/BATCH/RELEASE_YEAR/SINGLE_CASK)")
        VariantType variantType,
        @Schema(description = "에디션 값 (선택, 위스키 — 예: Batch 11, 2023)")
        @Size(max = 100, message = "에디션 값은 100자 이하여야 합니다.")
        String variantValue,
        @Schema(description = "에디션 값 영문 (선택, 위스키)")
        @Size(max = 100, message = "에디션 값(영문)은 100자 이하여야 합니다.")
        String variantValueEn
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
