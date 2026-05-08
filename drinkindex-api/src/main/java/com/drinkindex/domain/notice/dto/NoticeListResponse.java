package com.drinkindex.domain.notice.dto;

import com.drinkindex.domain.notice.entity.Notice;
import com.drinkindex.domain.notice.entity.NoticeCategory;
import lombok.Getter;

import java.time.LocalDateTime;

// [보안] content, contentSanitized 모두 목록 응답에 포함하지 않음.
@Getter
public class NoticeListResponse {

    private final Long id;
    private final String title;
    private final NoticeCategory category;
    private final Boolean isPinned;
    private final Long viewCount;
    private final LocalDateTime createdAt;

    private NoticeListResponse(Long id, String title, NoticeCategory category,
                               Boolean isPinned, Long viewCount, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.isPinned = isPinned;
        this.viewCount = viewCount;
        this.createdAt = createdAt;
    }

    public static NoticeListResponse from(Notice notice) {
        return new NoticeListResponse(
                notice.getId(),
                notice.getTitle(),
                notice.getCategory(),
                notice.getIsPinned(),
                notice.getViewCount(),
                notice.getCreatedAt()
        );
    }
}
