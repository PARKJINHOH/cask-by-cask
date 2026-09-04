package com.caskbycask.domain.venue.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * 공유 링크 해석 결과.
 *
 * <p>{@code source} 가 중요하다 — {@code GEOCODED} 면 관리자 화면이
 * "주소 검색 결과라 정확도 확인이 필요합니다"를 눈에 띄게 띄우고 명시적 확인을 받아야 한다.
 * 상호명에 대한 지오코딩 첫 결과는 자주 틀린다.
 */
public record VenueLinkResolveResponse(
        @Schema(description = "위도. 못 뽑았으면 null")
        BigDecimal lat,
        @Schema(description = "경도. 못 뽑았으면 null")
        BigDecimal lng,
        @Schema(description = "정규화된 지도 URL (확장에 성공한 경우)")
        String resolvedUrl,
        @Schema(description = "구글 place id")
        String googlePlaceId,
        @Schema(description = "네이버 place id")
        String naverPlaceId,
        @Schema(description = "출처 — PARSED(링크에서 직접) / EXPANDED(단축 확장 후) / GEOCODED(주소 검색) / NONE")
        Source source,
        @Schema(description = "사용자에게 보여 줄 안내 문구")
        String message
) {
    public enum Source {
        /** 붙여넣은 링크에서 바로 뽑았다. 가장 정확하다. */
        PARSED,
        /** 단축 링크를 펼친 뒤 뽑았다. */
        EXPANDED,
        /** 주소로 검색해 찾았다. <b>확인이 필요하다.</b> */
        GEOCODED,
        /** 아무것도 못 얻었다. 지도에서 직접 핀을 찍어야 한다. */
        NONE
    }

    public static VenueLinkResolveResponse none(String message) {
        return new VenueLinkResolveResponse(null, null, null, null, null, Source.NONE, message);
    }
}
