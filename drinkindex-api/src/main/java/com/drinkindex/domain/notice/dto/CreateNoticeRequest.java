package com.drinkindex.domain.notice.dto;

import com.drinkindex.domain.notice.entity.NoticeCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateNoticeRequest {

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 300, message = "제목은 300자를 초과할 수 없습니다.")
    private String title;

    // [보안] 이 필드는 서버에서 반드시 HtmlSanitizer.sanitize() 처리 후 저장.
    @NotBlank(message = "내용은 필수입니다.")
    private String content;

    private NoticeCategory category;

    private Boolean isPinned;

    private Boolean isPublished;
}
