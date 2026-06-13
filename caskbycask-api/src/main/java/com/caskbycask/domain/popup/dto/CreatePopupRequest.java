package com.caskbycask.domain.popup.dto;

import com.caskbycask.domain.popup.entity.enums.PopupDisplayPage;
import com.caskbycask.domain.popup.entity.enums.PopupLanguage;
import com.caskbycask.domain.popup.entity.enums.PopupType;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class CreatePopupRequest {

    @NotBlank(message = "관리자 제목은 필수입니다.")
    @Size(max = 200, message = "관리자 제목은 200자를 초과할 수 없습니다.")
    private String adminTitle;

    @NotNull(message = "팝업 타입은 필수입니다.")
    private PopupType popupType;

    @NotNull(message = "언어는 필수입니다.")
    private PopupLanguage language;

    private PopupDisplayPage displayPage = PopupDisplayPage.MAIN;

    // [보안] HTML형 전용. 서버에서 HtmlSanitizer.sanitize() 처리 후 저장.
    private String content;

    // 이미지형 전용
    private Long popupImageId;

    @URL(message = "올바른 URL 형식이어야 합니다.")
    private String linkUrl;

    private Boolean linkTargetBlank = false;

    @NotNull(message = "노출 여부는 필수입니다.")
    private Boolean isVisible;

    @NotNull(message = "순서는 필수입니다.")
    @Min(value = 0, message = "순서는 0 이상이어야 합니다.")
    private Integer sortOrder;

    @NotNull(message = "오버레이 닫기 여부는 필수입니다.")
    private Boolean closeOnOverlay;

    @NotNull(message = "상시 노출 여부는 필수입니다.")
    private Boolean isAlwaysVisible;

    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @AssertTrue(message = "HTML 타입 팝업은 content가 필수입니다.")
    private boolean isContentValidForType() {
        if (PopupType.HTML.equals(popupType)) {
            return content != null && !content.isBlank();
        }
        return true;
    }

    @AssertTrue(message = "IMAGE 타입 팝업은 popupImageId가 필수입니다.")
    private boolean isImageIdValidForType() {
        if (PopupType.IMAGE.equals(popupType)) {
            return popupImageId != null;
        }
        return true;
    }

    @AssertTrue(message = "종료일시는 시작일시 이후여야 합니다.")
    private boolean isDateRangeValid() {
        if (Boolean.FALSE.equals(isAlwaysVisible) && startAt != null && endAt != null) {
            return !endAt.isBefore(startAt);
        }
        return true;
    }
}
