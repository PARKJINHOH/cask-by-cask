package com.caskbycask.domain.youtube.dto;

import com.caskbycask.domain.youtube.entity.YoutubeChannel;

/**
 * 공개 채널 정보.
 * <p>
 * 소개문은 ko/en 을 모두 내려 프론트가 고르게 한다 — 주류명(nameKo/nameEn)과 같은 규약이라
 * 언어 전환 때 다시 요청하지 않아도 된다.
 */
public record YoutubeChannelResponse(
        Long id,
        String channelKey,
        String handle,
        String title,
        String description,
        String descriptionEn,
        String thumbnailUrl,
        String channelUrl,
        long videoCount
) {
    public static YoutubeChannelResponse from(YoutubeChannel channel, long videoCount) {
        return new YoutubeChannelResponse(
                channel.getId(),
                channel.getChannelKey(),
                channel.getHandle(),
                channel.getTitle(),
                channel.getDescription(),
                channel.getDescriptionEn(),
                channel.getThumbnailUrl(),
                channel.getChannelUrl(),
                videoCount
        );
    }
}
