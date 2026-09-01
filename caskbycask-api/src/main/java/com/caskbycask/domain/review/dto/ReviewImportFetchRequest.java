package com.caskbycask.domain.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewImportFetchRequest(
        @Schema(description = "공개 게시글 주소 (디시인사이드 갤러리 / 아카라이브)")
        @NotBlank(message = "게시글 주소를 입력해주세요.")
        @Size(max = 500, message = "주소가 너무 깁니다.")
        String url
) {
}
