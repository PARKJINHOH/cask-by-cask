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
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
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
        @Schema(description = "빈티지 연도 (선택)")
        @Min(value = SpiritLimits.YEAR_MIN, message = "빈티지 연도는 1800년 이후여야 합니다.")
        @Max(value = SpiritLimits.YEAR_MAX, message = "빈티지 연도는 2100년 이하여야 합니다.")
        Integer vintageYear,
        @Schema(description = "알코올 도수 % (0.0~100.0)")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,
        @Schema(description = "용량 ml (선택)")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "용량은 30000ml 이하여야 합니다.")
        Integer volumeMl,
        @Schema(description = "최소 알코올 도수 % (선택, 범위 지정 시)")
        @DecimalMin(value = "0.0", message = "최소 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최소 도수는 100.0 이하이어야 합니다.")
        BigDecimal abvMin,
        @Schema(description = "최대 알코올 도수 % (선택, 범위 지정 시)")
        @DecimalMin(value = "0.0", message = "최대 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최대 도수는 100.0 이하이어야 합니다.")
        BigDecimal abvMax,
        @Schema(description = "최소 용량 ml (선택, 범위 지정 시)")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "최소 용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "최소 용량은 30000ml 이하여야 합니다.")
        Integer volumeMlMin,
        @Schema(description = "최대 용량 ml (선택, 범위 지정 시)")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "최대 용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "최대 용량은 30000ml 이하여야 합니다.")
        Integer volumeMlMax,
        @Schema(description = "생산 국가 (선택)")
        @Size(max = 100, message = "생산 국가는 100자 이하여야 합니다.")
        String country,
        @Schema(description = "생산 지역 (선택)")
        @Size(max = 100, message = "생산 지역은 100자 이하여야 합니다.")
        String region,
        @Schema(description = "와인 산지 코드 (선택, WineRegion — 지도 표시용)", example = "FR_BORDEAUX_MEDOC")
        @Size(max = 40, message = "산지 코드는 40자 이하여야 합니다.")
        String regionCode,
        @Schema(description = "숙성 연수 (선택, isNas=true 시 무시)")
        Integer ageStatement,
        @Schema(description = "숙성 개월 (선택, 0~11, isNas=true 시 무시)")
        @Min(value = 0, message = "숙성 개월은 0 이상이어야 합니다.")
        @Max(value = 11, message = "숙성 개월은 11 이하여야 합니다.")
        Integer ageStatementMonths,
        @Schema(description = "NAS(숙성 연수 미표기) 여부 (선택)")
        Boolean isNas,
        @Schema(description = "증류 연월 (선택, YYYY 또는 YYYY-MM)")
        @Pattern(regexp = "^\\d{4}(-(0[1-9]|1[0-2]))?$", message = "증류 연월 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM, 월은 01~12).")
        String distilledDate,
        @Schema(description = "병입 연월 (선택, YYYY 또는 YYYY-MM)")
        @Pattern(regexp = "^\\d{4}(-(0[1-9]|1[0-2]))?$", message = "병입 연월 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM, 월은 01~12).")
        String bottledDate,
        @Schema(description = "병 번호 (선택, 예: 123/500)")
        @Size(max = 50, message = "병 번호는 50자 이하여야 합니다.")
        String bottleNo,
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
        @DecimalMin(value = "0.0", message = "phenolPpm은 0 이상이어야 합니다.")
        @DecimalMax(value = "999.9", message = "phenolPpm은 999 이하이어야 합니다.")
        BigDecimal phenolPpm,
        @Schema(description = "최소 피트 강도 ppm (선택, 위스키)")
        @DecimalMin(value = "0.0", message = "phenolPpmMin은 0 이상이어야 합니다.")
        @DecimalMax(value = "999.9", message = "phenolPpmMin은 999 이하이어야 합니다.")
        BigDecimal phenolPpmMin,
        @Schema(description = "최대 피트 강도 ppm (선택, 위스키)")
        @DecimalMin(value = "0.0", message = "phenolPpmMax은 0 이상이어야 합니다.")
        @DecimalMax(value = "999.9", message = "phenolPpmMax은 999 이하이어야 합니다.")
        BigDecimal phenolPpmMax,
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
        String variantValueEn,
        @Schema(description = "에디션 목록 표시용 시리즈 식별자")
        @Size(max = 100, message = "시리즈 식별자는 100자 이하여야 합니다.")
        String seriesIdentifier,

        @Schema(description = "에디션 목록 표시용 시리즈 식별자(영문)")
        @Size(max = 100, message = "시리즈 식별자(영문)는 100자 이하여야 합니다.")
        String seriesIdentifierEn,

        @Schema(description = """
                이미 등록된 주류의 에디션으로 등록해 달라는 요청일 때 그 마스터 주류 ID (선택).
                비어 보내면 지금처럼 새 마스터 주류를 만든다.
                채워 보내면 승인 시 새 주류 대신 **그 주류의 하위 에디션**이 생긴다.
                관리자가 검토 화면에서 직접 고르거나 바꿀 수도 있다.""")
        Long targetSpiritId
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

        /**
         * NAS 와 숙성 연수를 함께 보낼 수 없다.
         *
         * <p>관리자 등록은 {@code SpiritCommonDetailRequest} 가 같은 규칙을 가지고 있었지만
         * 이 요청 본문은 평탄화된 개별 필드라 그 검증을 타지 않았다.
         * 둘 다 담기면 서버가 NAS 를 우선해 숙성 연수를 버리므로 입력값이 조용히 사라진다.
         */
        @AssertTrue(message = "NAS 체크 시 숙성 연수를 입력할 수 없습니다.")
        public boolean isAgeStatementValidForNas() {
                return !Boolean.TRUE.equals(isNas)
                        || (ageStatement == null && ageStatementMonths == null);
        }

        /**
         * 위스키는 숙성 연수와 NAS 중 하나를 반드시 밝혀야 한다.
         *
         * <p>둘 다 비면 나이를 알 수 없는 술로 등록되고, 결국 관리자가 승인 화면에서 다시 메우게 된다.
         * 사용자 폼과 같은 기준(관리자 등록과 동일)이다.
         */
        public boolean hasAgeChoice() {
                if (category != SpiritCategory.WHISKY) return true;
                boolean hasAge = ageStatement != null || ageStatementMonths != null;
                return Boolean.TRUE.equals(isNas) != hasAge;
        }

        /**
         * 생산 정보(생산자·국가) 필수.
         *
         * <p>위스키는 증류소·브랜드명 택1 — 발란타인 같은 블렌디드는 특정 증류소가 없다.
         * 사용자는 생산자를 승인 대기로만 등록할 수 있어 id 가 없을 수 있으므로,
         * 그때는 프론트가 이름을 보내지 않는다 — 국가만 확실히 받고 생산자는 강제하지 않는다.
         */
        public boolean hasProductionInfo() {
                // 기존 주류에 붙이는 요청은 생산 정보를 마스터에서 복사한다 —
                // 화면에서도 그 칸을 숨기므로 여기서 요구하면 고칠 수 없는 이유로 막힌다.
                if (targetSpiritId != null) return true;
                return country != null && !country.isBlank();
        }

        /**
         * 기존 주류에 붙이는 요청이면 붙일 에디션이 있어야 한다.
         *
         * <p>에디션 없이 {@code targetSpiritId} 만 오면 관리자가 승인하려는 순간에야 막힐테니,
         * 제출 시점에 걸러 신청자가 바로 고칠 수 있게 한다.
         */
        public boolean hasVariantForTarget() {
                if (targetSpiritId == null) return true;
                return variantType != null
                        && variantType != VariantType.NONE
                        && variantValue != null && !variantValue.isBlank();
        }
}
