package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.producer.dto.ProducerLogoResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SpiritDetailResponse(

        @Schema(description = "술 고유 ID")
        Long id,
        @Schema(description = "한글 제품명")
        String nameKo,
        @Schema(description = "영문 제품명")
        String nameEn,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "증류소 ID")
        Long producerId,
        @Schema(description = "증류소 한글명")
        String producerNameKo,
        @Schema(description = "증류소 영문명")
        String producerNameEn,
        @Schema(description = "증류소 로고 이미지 목록(최대 5장, sortOrder 순) — 0번이 대표. 포토카드 등에서 사용")
        List<ProducerLogoResponse> producerLogoImages,
        @Schema(description = "증류소 소재 국가")
        String producerCountry,
        @Schema(description = "빈티지 연도")
        Integer vintageYear,
        @Schema(description = "알코올 도수 %")
        BigDecimal abv,
        @Schema(description = "용량 ml")
        Integer volumeMl,
        @Schema(description = "생산 국가")
        String country,
        @Schema(description = "생산 지역")
        String region,
        @Schema(description = "와인 산지 (지도 표시용) — 산지 미지정 시 null")
        SpiritWineRegionResponse wineRegion,
        @Schema(description = "전체 리뷰 평균 점수")
        BigDecimal avgScore,
        @Schema(description = "리뷰 수 (점수를 남기지 않은 리뷰 포함)")
        Integer reviewCount,
        @Schema(description = "평균 점수의 모수 — 점수를 남긴 리뷰 수")
        Integer scoredReviewCount,
        @Schema(description = "공개 상태")
        SpiritStatus status,
        @Schema(description = "이미지 목록 — 이 주류의 이미지(에디션이면 없을 때 마스터로 폴백)")
        List<SpiritImageResponse> images,
        @Schema(description = "에디션 그룹 전체 이미지 (마스터 + 모든 ACTIVE 하위 에디션). 상세 갤러리 전용")
        List<SpiritImageResponse> groupImages,
        @Schema(description = "등록 일시")
        LocalDateTime createdAt,
        @Schema(description = "최종 수정 일시")
        LocalDateTime updatedAt,

        // ── 상세 필드 ──────────────────────────────────────────
        @Schema(description = "공통 상세 정보")
        SpiritCommonDetailResponse commonDetail,
        @Schema(description = "위스키 상세 (category=WHISKY 전용)")
        WhiskyDetailResponse whiskyDetail,
        @Schema(description = "와인 상세 (category=WINE 전용)")
        WineDetailResponse wineDetail,
        @Schema(description = "꼬냑 상세 (category=COGNAC 전용)")
        CognacDetailResponse cognacDetail,
        @Schema(description = "기타 상세 (category=OTHER 전용)")
        OtherDetailResponse otherDetail,

        @Schema(description = "마스터 주류 ID")
        Long parentId,

        @Schema(description = "에디션 유형")
        VariantType variantType,

        @Schema(description = "에디션 식별 값")
        String variantValue,

        @Schema(description = "에디션 식별 값(영문)")
        String variantValueEn,

        @Schema(description = "에디션 목록 표시용 시리즈 식별자")
        String seriesIdentifier,

        @Schema(description = "에디션 목록 표시용 시리즈 식별자(영문)")
        String seriesIdentifierEn,

        @Schema(description = "하위 에디션 표시 순서")
        Integer displayOrder,

        @Schema(description = "최소 도수")
        BigDecimal abvMin,

        @Schema(description = "최대 도수")
        BigDecimal abvMax,

        @Schema(description = "최소 용량")
        Integer volumeMlMin,

        @Schema(description = "최대 용량")
        Integer volumeMlMax,

        @Schema(description = "조회수")
        Integer viewCount,

        @Schema(description = "외부 데이터 제공자")
        String sourceProvider,

        @Schema(description = "외부 원문 URL")
        String sourceUrl,

        @Schema(description = "이용 허가된 외부 대표 이미지 URL")
        String sourceImageUrl,

        @Schema(description = "외부 제공자 평점")
        BigDecimal sourceRating,

        @Schema(description = "외부 제공자 평점 참여 수")
        Integer sourceRatingCount,

        @Schema(description = "하위 에디션 목록")
        List<SpiritVariantResponse> variants
) {
    /** 상세 없이 기본 정보만 반환 (등록·수정 응답) — 이 경로는 생산자 로고 목록을 조회하지 않는다. */
    public static SpiritDetailResponse of(Spirit spirit, List<SpiritImageResponse> images) {
        return of(spirit, images, List.of(), List.of(), null, null, null, null, null, List.of());
    }

    /** 전체 상세 포함 응답 (GET /api/spirits/{id}) */
    public static SpiritDetailResponse of(Spirit spirit, List<SpiritImageResponse> images,
                                           List<SpiritImageResponse> groupImages,
                                           List<ProducerLogoResponse> producerLogoImages,
                                           SpiritCommonDetailResponse commonDetail,
                                           WhiskyDetailResponse whiskyDetail,
                                           WineDetailResponse wineDetail,
                                           CognacDetailResponse cognacDetail,
                                           OtherDetailResponse otherDetail,
                                           List<SpiritVariantResponse> variants) {
        return new SpiritDetailResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getProducer() != null ? spirit.getProducer().getId() : null,
                spirit.getProducer() != null ? spirit.getProducer().getNameKo() : null,
                spirit.getProducer() != null ? spirit.getProducer().getNameEn() : null,
                producerLogoImages,
                spirit.getProducer() != null ? spirit.getProducer().getCountry() : null,
                spirit.getVintageYear(),
                spirit.getAbv(),
                spirit.getVolumeMl(),
                spirit.getCountry(),
                spirit.getRegion(),
                SpiritWineRegionResponse.from(spirit.getRegionCode()),
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                spirit.getScoredReviewCount(),
                spirit.getStatus(),
                images,
                groupImages,
                spirit.getCreatedAt(),
                spirit.getUpdatedAt(),
                commonDetail,
                whiskyDetail,
                wineDetail,
                cognacDetail,
                otherDetail,
                spirit.getParent() != null ? spirit.getParent().getId() : null,
                spirit.getVariantType(),
                spirit.getVariantValue(),
                spirit.getVariantValueEn(),
                spirit.getSeriesIdentifier(),
                spirit.getSeriesIdentifierEn(),
                spirit.getDisplayOrder(),
                spirit.getAbvMin(),
                spirit.getAbvMax(),
                spirit.getVolumeMlMin(),
                spirit.getVolumeMlMax(),
                spirit.getViewCount(),
                spirit.getSourceProvider(),
                spirit.getSourceUrl(),
                spirit.getSourceImageUrl(),
                spirit.getSourceRating(),
                spirit.getSourceRatingCount(),
                variants
        );
    }
}
