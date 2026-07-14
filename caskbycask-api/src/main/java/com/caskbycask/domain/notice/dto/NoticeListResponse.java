package com.caskbycask.domain.notice.dto;

import com.caskbycask.domain.notice.entity.Notice;
import com.caskbycask.domain.notice.entity.NoticeCategory;
import lombok.Getter;

import java.time.LocalDateTime;

// [보안] content, contentSanitized 모두 목록 응답에 포함하지 않음.
@Getter
public class NoticeListResponse {

    private final Long id;
    private final String title;
    private final NoticeCategory category;
    private final Boolean isPinned;
    private final Boolean isPublished;
    private final Long viewCount;
    private final Long recommendCount;
    private final Boolean isRecommended;
    private final LocalDateTime publishedAt;
    private final LocalDateTime createdAt;

    private NoticeListResponse(Long id, String title, NoticeCategory category,
                               Boolean isPinned, Boolean isPublished,
                               Long viewCount, Long recommendCount, Boolean isRecommended,
                               LocalDateTime publishedAt, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.isPinned = isPinned;
        this.isPublished = isPublished;
        this.viewCount = viewCount;
        this.recommendCount = recommendCount;
        this.isRecommended = isRecommended;
        this.publishedAt = publishedAt;
        this.createdAt = createdAt;
    }

    public static NoticeListResponse from(Notice notice) {
        return from(notice, false);
    }

    public static NoticeListResponse from(Notice notice, boolean isRecommended) {
        return new NoticeListResponse(
                notice.getId(),
                notice.getTitle(),
                notice.getCategory(),
                notice.getIsPinned(),
                notice.getIsPublished(),
                notice.getViewCount(),
                notice.getRecommendCount(),
                isRecommended,
                notice.getPublishedAt(),
                notice.getCreatedAt()
        );
    }
}
