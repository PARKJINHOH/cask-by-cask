package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritCognacDetail;
import com.caskbycask.domain.spirit.entity.SpiritOtherDetail;
import com.caskbycask.domain.spirit.entity.SpiritWhiskyDetail;
import com.caskbycask.domain.spirit.entity.SpiritWineDetail;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

public record SpiritListResponse(
        @Schema(description = "술 고유 ID")
        Long id,
        @Schema(description = "한글 제품명")
        String nameKo,
        @Schema(description = "영문 제품명")
        String nameEn,
        @Schema(description = "에디션 목록 표시용 시리즈 식별자")
        String seriesIdentifier,
        @Schema(description = "에디션 목록 표시용 시리즈 식별자(영문)")
        String seriesIdentifierEn,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "와인 빈티지 연도")
        Integer vintageYear,
        @Schema(description = "와인 빈티지 상태")
        WineVintageStatus vintageStatus,
        @Schema(description = "생산 국가")
        String country,
        @Schema(description = "알코올 도수 %")
        BigDecimal abv,
        @Schema(description = "최소 도수")
        BigDecimal abvMin,
        @Schema(description = "최대 도수")
        BigDecimal abvMax,
        @Schema(description = "전체 리뷰 평균 점수")
        BigDecimal avgScore,
        @Schema(description = "리뷰 수")
        Integer reviewCount,
        @Schema(description = "대표 이미지 URL")
        String primaryImageUrl,
        @Schema(description = "KO canonical path")
        String canonicalPathKo,
        @Schema(description = "EN canonical path")
        String canonicalPathEn,
        @Schema(description = "카테고리별 스타일/유형 코드")
        String style,
        @Schema(description = "스타일 직접 입력값")
        String styleOther,
        @Schema(description = "조회수")
        Integer viewCount,
        @Schema(description = "공개 상태 (ACTIVE, HIDDEN, PENDING)")
        SpiritStatus status
) {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static SpiritListResponse of(Spirit spirit, String primaryImageUrl) {
        return of(spirit, primaryImageUrl, spirit);
    }

    public static SpiritListResponse of(Spirit spirit, String primaryImageUrl, Spirit canonicalSpirit) {
        return new SpiritListResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                displaySeriesIdentifier(spirit, canonicalSpirit),
                displaySeriesIdentifierEn(spirit, canonicalSpirit),
                spirit.getCategory(),
                spirit.getVintageYear(),
                wineVintageStatus(spirit),
                spirit.getCountry(),
                spirit.getAbv(),
                spirit.getAbvMin(),
                spirit.getAbvMax(),
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                primaryImageUrl,
                SpiritSlugUtils.canonicalPathKo(canonicalSpirit),
                SpiritSlugUtils.canonicalPathEn(canonicalSpirit),
                null,
                null,
                spirit.getViewCount(),
                spirit.getStatus()
        );
    }

    public static SpiritListResponse ofWithStyle(Spirit spirit, String primaryImageUrl) {
        return ofWithStyle(spirit, primaryImageUrl, spirit);
    }

    public static SpiritListResponse ofWithStyle(Spirit spirit, String primaryImageUrl, Spirit canonicalSpirit) {
        return new SpiritListResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                displaySeriesIdentifier(spirit, canonicalSpirit),
                displaySeriesIdentifierEn(spirit, canonicalSpirit),
                spirit.getCategory(),
                spirit.getVintageYear(),
                wineVintageStatus(spirit),
                spirit.getCountry(),
                spirit.getAbv(),
                spirit.getAbvMin(),
                spirit.getAbvMax(),
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                primaryImageUrl,
                SpiritSlugUtils.canonicalPathKo(canonicalSpirit),
                SpiritSlugUtils.canonicalPathEn(canonicalSpirit),
                styleCode(spirit),
                styleOther(spirit),
                spirit.getViewCount(),
                spirit.getStatus()
        );
    }

    private static String displaySeriesIdentifier(Spirit spirit, Spirit canonicalSpirit) {
        return hasText(spirit.getSeriesIdentifier())
                ? spirit.getSeriesIdentifier()
                : canonicalSpirit.getSeriesIdentifier();
    }

    private static String displaySeriesIdentifierEn(Spirit spirit, Spirit canonicalSpirit) {
        return hasText(spirit.getSeriesIdentifierEn())
                ? spirit.getSeriesIdentifierEn()
                : canonicalSpirit.getSeriesIdentifierEn();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String styleCode(Spirit spirit) {
        return switch (spirit.getCategory()) {
            case WHISKY -> {
                SpiritWhiskyDetail detail = spirit.getWhiskyDetail();
                yield detail != null && detail.getStyle() != null ? detail.getStyle().name() : null;
            }
            case WINE -> {
                SpiritWineDetail detail = spirit.getWineDetail();
                yield detail != null && detail.getWineType() != null ? detail.getWineType().name() : null;
            }
            case COGNAC -> {
                SpiritCognacDetail detail = spirit.getCognacDetail();
                yield detail != null && detail.getGrade() != null ? detail.getGrade().name() : null;
            }
            case OTHER -> {
                SpiritOtherDetail detail = spirit.getOtherDetail();
                yield detail != null && detail.getOtherType() != null ? detail.getOtherType().name() : null;
            }
        };
    }

    private static WineVintageStatus wineVintageStatus(Spirit spirit) {
        SpiritWineDetail detail = spirit.getWineDetail();
        return spirit.getCategory() == SpiritCategory.WINE && detail != null
                ? detail.getVintageStatus()
                : null;
    }

    private static String styleOther(Spirit spirit) {
        if (spirit.getCategory() != SpiritCategory.WHISKY) return null;

        SpiritWhiskyDetail detail = spirit.getWhiskyDetail();
        if (detail == null || detail.getStyle() != WhiskyStyle.OTHER) return null;

        return extraString(detail.getExtraData(), "styleOther");
    }

    private static String extraString(String extraData, String key) {
        if (extraData == null || extraData.isBlank()) return null;

        try {
            JsonNode value = OBJECT_MAPPER.readTree(extraData).get(key);
            if (value == null || !value.isTextual()) return null;

            String text = value.asText();
            return text.isBlank() ? null : text;
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
