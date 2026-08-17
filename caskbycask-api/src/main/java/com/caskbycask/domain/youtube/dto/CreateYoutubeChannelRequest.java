package com.caskbycask.domain.youtube.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 채널 등록 요청.
 * <p>
 * {@code channelUrl} 에는 채널 홈 주소(@핸들), 핸들, 채널 ID 중 무엇을 넣어도 된다 —
 * 서버가 식별자만 뽑아 낸다({@code YoutubeUrlParser}). 제목·프로필은 비워 두면 채널에서 읽어 채운다.
 */
public record CreateYoutubeChannelRequest(
        @NotBlank(message = "채널 주소를 입력해주세요.")
        @Size(max = 500)
        String channelUrl,

        @Size(max = 200)
        String title,

        @Size(max = 500)
        String description,

        @Size(max = 500)
        String descriptionEn,

        @Size(max = 1000)
        String thumbnailUrl,

        Boolean visible,

        Boolean syncEnabled,

        /** 채널 운영자 게재 허락 확인. false 면 등록은 되지만 갤러리에 노출되지 않는다. */
        Boolean permissionConfirmed,

        @Size(max = 500)
        String permissionNote
) {
}
