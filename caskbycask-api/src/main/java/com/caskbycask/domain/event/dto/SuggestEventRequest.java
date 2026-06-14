package com.caskbycask.domain.event.dto;

import com.caskbycask.domain.event.entity.enums.EventCategory;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

import java.time.LocalDate;

/**
 * 사용자 이벤트 제보 입력.
 * 관리자 등록(CreateEventRequest)과 달리 노출 여부(isVisible)는 없다 — 항상 검토 대기(false)로 생성된다.
 */
@Getter
@NoArgsConstructor
public class SuggestEventRequest {

    @NotBlank(message = "이벤트명은 필수입니다.")
    @Size(max = 200, message = "이벤트명은 200자를 초과할 수 없습니다.")
    private String title;

    @Size(max = 2000, message = "설명은 2000자를 초과할 수 없습니다.")
    private String description;

    @URL(message = "올바른 URL 형식이어야 합니다.")
    @Size(max = 500, message = "링크는 500자를 초과할 수 없습니다.")
    private String linkUrl;

    @NotNull(message = "카테고리는 필수입니다.")
    private EventCategory category;

    @NotNull(message = "시작일은 필수입니다.")
    private LocalDate startDate;

    // null 이면 단일일 이벤트.
    private LocalDate endDate;

    @AssertTrue(message = "종료일은 시작일 이후여야 합니다.")
    private boolean isDateRangeValid() {
        if (startDate != null && endDate != null) {
            return !endDate.isBefore(startDate);
        }
        return true;
    }
}
