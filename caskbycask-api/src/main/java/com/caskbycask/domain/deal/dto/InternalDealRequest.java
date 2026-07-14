package com.caskbycask.domain.deal.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 크롤러(caskbycask-crawler) → 백엔드 수신 페이로드.
 * 필드는 크롤러 uploader/api_uploader.py 의 build_payload() 와 1:1 대응.
 *
 * [보안] 크롤러/AI 환각으로 인한 비정상 데이터를 컨트롤러 진입 시점에 거른다.
 *   각 @Size 상한은 DealPost 엔티티 컬럼 길이와 일치시켜, 길이 초과가 flush 시점의
 *   DataIntegrityViolationException(=중복으로 오인)으로 빠지지 않도록 한다.
 */
public record InternalDealRequest(
        @NotBlank
        @Size(max = 500)
        @Pattern(regexp = "^https?://.+", message = "sourceUrl 은 http(s) URL 형식이어야 합니다.")
        String sourceUrl,

        @NotBlank
        @Size(max = 50)
        String sourceSite,

        @Size(max = 200) String drinkName,
        @Size(max = 50) String drinkCategory,
        @Min(1) @Max(100000) Integer volumeMl,
        Integer originalPrice,
        Integer dealPrice,
        BigDecimal discountRate,
        @Size(max = 10) String currency,
        @Size(max = 200) String seller,
        @Size(max = 500) String dealCondition,
        @Size(max = 200) String expiryInfo,

        @Min(1) @Max(10) Integer confidenceScore,
        String summaryKo,
        OffsetDateTime crawledAt
) {
}
