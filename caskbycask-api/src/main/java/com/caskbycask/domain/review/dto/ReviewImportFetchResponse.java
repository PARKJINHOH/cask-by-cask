package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.support.ReviewSourceUrlParser.SourceSite;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 원문 게시글에서 읽어 온 텍스트. 저장하지 않고 그대로 돌려주기만 한다.
 * 향·맛·피니시로 나누는 일은 프론트의 `reviewImportParser` 가 한다 — 규칙이 한 곳에만 있어야 한다.
 */
public record ReviewImportFetchResponse(
        @Schema(description = "출처 사이트")
        SourceSite sourceSite,
        @Schema(description = "게시글 제목 (비교 리뷰 판정에 함께 쓴다)")
        String title,
        @Schema(description = "게시글 본문 텍스트. 이미지는 포함하지 않는다.")
        String content,
        @Schema(description = "서버가 식별자로 다시 조립한 주소 — 사용자가 넣은 문자열 그대로가 아니다.")
        String canonicalUrl
) {
}
