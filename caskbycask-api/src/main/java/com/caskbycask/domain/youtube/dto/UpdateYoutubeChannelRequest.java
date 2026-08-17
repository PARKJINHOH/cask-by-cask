package com.caskbycask.domain.youtube.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 채널 수정 요청.
 * <p>
 * 채널 ID 는 바꿀 수 없다 — 바꾸면 이미 수집된 영상의 소속이 통째로 어긋난다.
 * 다른 채널을 넣으려면 새로 등록한다.
 */
public record UpdateYoutubeChannelRequest(
        @NotBlank(message = "채널명을 입력해주세요.")
        @Size(max = 200)
        String title,

        @Size(max = 100)
        String handle,

        @Size(max = 500)
        String description,

        @Size(max = 500)
        String descriptionEn,

        @Size(max = 1000)
        String thumbnailUrl,

        Boolean visible,

        Boolean syncEnabled,

        Boolean permissionConfirmed,

        @Size(max = 500)
        String permissionNote
) {
}
