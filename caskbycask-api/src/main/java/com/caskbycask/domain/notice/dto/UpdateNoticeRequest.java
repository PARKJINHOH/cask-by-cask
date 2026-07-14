package com.caskbycask.domain.notice.dto;

import com.caskbycask.domain.notice.entity.NoticeCategory;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class UpdateNoticeRequest {

    @Size(max = 300, message = "제목은 300자를 초과할 수 없습니다.")
    private String title;

    // [보안] 변경 시 HtmlSanitizer.sanitize() 재처리 필수.
    private String content;

    private NoticeCategory category;

    private Boolean isPinned;

    private Boolean isPublished;

    private LocalDateTime publishedAt;
}
