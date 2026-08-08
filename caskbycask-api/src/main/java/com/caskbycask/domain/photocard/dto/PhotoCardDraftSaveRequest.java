package com.caskbycask.domain.photocard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 임시저장 요청(multipart 의 {@code data} 파트).
 * <p>
 * {@code content} 는 서버가 해석하지 않는다 — 편집기가 되살릴 때 필요한 것을 그대로 담은 JSON 이고,
 * 이 값이 공개되는 경로는 없다(본인만 다시 불러온다). 대신 길이 상한만 서비스에서 검사한다.
 */
public record PhotoCardDraftSaveRequest(
        /** 기존 임시저장을 덮어쓸 때. 없으면 새 항목으로 쌓인다. */
        Long id,

        @Size(max = 100, message = "임시저장 이름은 100자 이내여야 합니다.")
        String name,

        @NotBlank(message = "임시저장할 내용이 없습니다.")
        String content,

        /** 목록에서 알아보기 위한 작은 미리보기(data URI). 없으면 이전 값을 유지한다. */
        String thumbnail
) {}
