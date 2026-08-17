package com.caskbycask.domain.youtube.dto;

import com.caskbycask.domain.youtube.entity.YoutubeChannel;

import java.time.LocalDateTime;

/** 관리자 채널 목록·상세. 공개 응답과 달리 수집 상태와 허락 확인 정보를 함께 담는다. */
public record AdminYoutubeChannelResponse(
        Long id,
        String channelKey,
        String handle,
        String title,
        String description,
        String descriptionEn,
        String thumbnailUrl,
        String channelUrl,
        boolean visible,
        boolean syncEnabled,
        boolean permissionConfirmed,
        String permissionNote,
        Integer sortOrder,
        LocalDateTime lastSyncedAt,
        String lastSyncError,
        long videoCount,
        LocalDateTime createdAt
) {
    public static AdminYoutubeChannelResponse from(YoutubeChannel channel, long videoCount) {
        return new AdminYoutubeChannelResponse(
                channel.getId(),
                channel.getChannelKey(),
                channel.getHandle(),
                channel.getTitle(),
                channel.getDescription(),
                channel.getDescriptionEn(),
                channel.getThumbnailUrl(),
                channel.getChannelUrl(),
                Boolean.TRUE.equals(channel.getIsVisible()),
                Boolean.TRUE.equals(channel.getSyncEnabled()),
                Boolean.TRUE.equals(channel.getPermissionConfirmed()),
                channel.getPermissionNote(),
                channel.getSortOrder(),
                channel.getLastSyncedAt(),
                channel.getLastSyncError(),
                videoCount,
                channel.getCreatedAt()
        );
    }
}
