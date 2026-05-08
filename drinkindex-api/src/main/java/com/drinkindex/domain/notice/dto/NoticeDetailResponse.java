package com.drinkindex.domain.notice.dto;

import com.drinkindex.domain.notice.entity.Notice;
import com.drinkindex.domain.notice.entity.NoticeCategory;
import com.drinkindex.domain.notice.entity.NoticeImage;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

// [보안] content(원본 HTML) 필드 없음 — contentSanitized만 응답에 포함.
@Getter
public class NoticeDetailResponse {

    private final Long id;
    private final String title;
    private final String contentSanitized;
    private final NoticeCategory category;
    private final Boolean isPinned;
    private final Long viewCount;
    private final List<NoticeImageResponse> images;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    private NoticeDetailResponse(Long id, String title, String contentSanitized,
                                 NoticeCategory category, Boolean isPinned, Long viewCount,
                                 List<NoticeImageResponse> images,
                                 LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.title = title;
        this.contentSanitized = contentSanitized;
        this.category = category;
        this.isPinned = isPinned;
        this.viewCount = viewCount;
        this.images = images;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static NoticeDetailResponse from(Notice notice, List<NoticeImage> images) {
        return new NoticeDetailResponse(
                notice.getId(),
                notice.getTitle(),
                notice.getContentSanitized(),
                notice.getCategory(),
                notice.getIsPinned(),
                notice.getViewCount(),
                images.stream().map(NoticeImageResponse::from).collect(Collectors.toList()),
                notice.getCreatedAt(),
                notice.getUpdatedAt()
        );
    }
}
