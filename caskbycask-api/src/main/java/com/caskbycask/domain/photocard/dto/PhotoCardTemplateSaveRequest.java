package com.caskbycask.domain.photocard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 템플릿 저장 요청.
 * <p>
 * {@code schemaVersion} 은 받지 않는다 — 서버가 저장 직전에 자기 상수로 채운다.
 * 클라이언트가 보낸 버전을 믿으면 구버전 스키마가 최신인 척 저장될 수 있다.
 */
public record PhotoCardTemplateSaveRequest(
        @NotBlank(message = "템플릿 이름을 입력해주세요.")
        @Size(max = 60, message = "템플릿 이름은 60자 이내여야 합니다.")
        String name,

        @Size(max = 200, message = "설명은 200자 이내여야 합니다.")
        String description,

        @NotNull(message = "레이아웃이 비어 있습니다.")
        PhotoCardLayout layout,

        /** 미리보기 이미지 URL — /api/photo-cards/images 로 먼저 업로드한 결과 */
        @Size(max = 500)
        String thumbnailUrl,

        @Size(max = 255)
        String thumbnailSavedFileName,

        @Size(max = 200)
        String thumbnailSubPath,

        /** 사용자 템플릿의 공개 여부. 생략하면 비공개. 공식 템플릿에서는 무시된다. */
        Boolean isPublic
) {}
