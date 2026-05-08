package com.drinkindex.domain.notice.dto;

import com.drinkindex.domain.notice.entity.Notice;
import com.drinkindex.domain.notice.entity.NoticeCategory;
import com.drinkindex.domain.notice.entity.NoticeImage;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

// 관리자 전용 상세 응답 — content(원본 HTML) 포함 (TipTap 편집용).
// [보안] 이 DTO는 관리자 엔드포인트(@PreAuthorize ADMIN)에서만 사용할 것.
@Getter
public class NoticeAdminDetailResponse {

    private final Long id;
    private final String title;
    private final String content;
    private final String contentSanitized;
    private final NoticeCategory category;
    private final Boolean isPinned;
    private final Boolean isPublished;
    private final Long viewCount;
    private final List<NoticeImageResponse> images;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    private NoticeAdminDetailResponse(Long id, String title, String content, String contentSanitized,
                                      NoticeCategory category, Boolean isPinned, Boolean isPublished,
                                      Long viewCount, List<NoticeImageResponse> images,
                                      LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.contentSanitized = contentSanitized;
        this.category = category;
        this.isPinned = isPinned;
        this.isPublished = isPublished;
        this.viewCount = viewCount;
        this.images = images;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static NoticeAdminDetailResponse from(Notice notice, List<NoticeImage> images) {
        return new NoticeAdminDetailResponse(
                notice.getId(),
                notice.getTitle(),
                notice.getContent(),
                notice.getContentSanitized(),
                notice.getCategory(),
                notice.getIsPinned(),
                notice.getIsPublished(),
                notice.getViewCount(),
                images.stream().map(NoticeImageResponse::from).collect(Collectors.toList()),
                notice.getCreatedAt(),
                notice.getUpdatedAt()
        );
    }
}
