package com.caskbycask.domain.youtube.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 영상 직접 등록 요청.
 * <p>
 * 채널 RSS 는 최신 15편만 담는다. 그보다 오래된 대표 영상을 갤러리에 올리려면 이 경로를 쓴다.
 * {@code videoUrl} 은 watch·youtu.be·shorts·embed 주소와 11자 영상 ID 를 모두 받는다.
 */
public record CreateYoutubeVideoRequest(
        @NotNull(message = "채널을 선택해주세요.")
        Long channelId,

        @NotBlank(message = "영상 주소를 입력해주세요.")
        @Size(max = 500)
        String videoUrl,

        /** 비우면 유튜브에서 읽어 채운다. */
        @Size(max = 300)
        String title,

        /** VIDEO / SHORTS. 비우면 주소 형태로 판단한다(/shorts/ 면 SHORTS). */
        @Size(max = 20)
        String videoType
) {
}
