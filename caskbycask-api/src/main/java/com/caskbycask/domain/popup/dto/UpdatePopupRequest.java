package com.caskbycask.domain.popup.dto;

import com.caskbycask.domain.popup.entity.enums.PopupDisplayPage;
import com.caskbycask.domain.popup.entity.enums.PopupLanguage;
import com.caskbycask.domain.popup.entity.enums.PopupType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class UpdatePopupRequest {

    @Size(max = 200, message = "관리자 제목은 200자를 초과할 수 없습니다.")
    private String adminTitle;

    private PopupType popupType;
    private PopupLanguage language;
    private PopupDisplayPage displayPage;

    private String content;
    private Long popupImageId;

    @URL(message = "올바른 URL 형식이어야 합니다.")
    private String linkUrl;

    private Boolean linkTargetBlank;
    private Boolean isVisible;

    // 순서는 목록의 드래그 정렬(updateSortOrder)로만 바꾼다.

    private Boolean closeOnOverlay;
    private Boolean isAlwaysVisible;
    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @AssertTrue(message = "종료일시는 시작일시 이후여야 합니다.")
    private boolean isDateRangeValid() {
        if (startAt != null && endAt != null) {
            return !endAt.isBefore(startAt);
        }
        return true;
    }
}
