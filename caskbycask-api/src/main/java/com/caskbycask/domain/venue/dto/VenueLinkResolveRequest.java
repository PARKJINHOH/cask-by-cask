package com.caskbycask.domain.venue.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record VenueLinkResolveRequest(
        @Schema(description = "붙여넣은 지도 공유 링크 또는 좌표 문자열")
        @Size(max = 2000, message = "링크가 너무 깁니다.")
        String link,

        @Schema(description = "지오코딩 폴백에 쓸 주소·상호. 링크에서 좌표를 못 뽑았을 때만 쓴다")
        @Size(max = 300, message = "주소가 너무 깁니다.")
        String addressHint
) {
}
