package com.caskbycask.domain.youtube.dto;

import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.util.YoutubeUrlParser;

import java.time.LocalDateTime;
import java.util.List;

/** 관리자 영상 목록·상세. 숨긴 영상도 보이므로 노출 상태와 사유를 함께 담는다. */
public record AdminYoutubeVideoResponse(
        Long id,
        String videoKey,
        String title,
        String thumbnailUrl,
        String videoType,
        String source,
        LocalDateTime publishedAt,
        boolean visible,
        boolean pinned,
        String hiddenReason,
        /** 가용성 점검이 자동으로 내린 영상 — 관리자 숨김과 구분해 표시한다. */
        boolean autoHidden,
        LocalDateTime lastCheckedAt,
        String watchUrl,
        Long channelId,
        String channelTitle,
        List<YoutubeSpiritTagInfo> spiritTags
) {
    public static AdminYoutubeVideoResponse from(YoutubeVideo video, boolean includeTags) {
        return new AdminYoutubeVideoResponse(
                video.getId(),
                video.getVideoKey(),
                video.getTitle(),
                video.getThumbnailUrl(),
                video.getVideoType().name(),
                video.getSource().name(),
                video.getPublishedAt(),
                Boolean.TRUE.equals(video.getIsVisible()),
                Boolean.TRUE.equals(video.getIsPinned()),
                video.getHiddenReason(),
                Boolean.TRUE.equals(video.getAutoHidden()),
                video.getLastCheckedAt(),
                YoutubeUrlParser.watchUrl(video.getVideoKey()),
                video.getChannel().getId(),
                video.getChannel().getTitle(),
                includeTags
                        ? video.getSpiritTags().stream().map(YoutubeSpiritTagInfo::from).toList()
                        : List.of()
        );
    }
}
