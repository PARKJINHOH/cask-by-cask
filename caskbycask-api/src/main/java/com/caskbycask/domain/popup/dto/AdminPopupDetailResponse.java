package com.caskbycask.domain.popup.dto;

import com.caskbycask.domain.popup.entity.Popup;
import com.caskbycask.domain.popup.entity.PopupImage;
import com.caskbycask.domain.popup.entity.enums.PopupDisplayPage;
import com.caskbycask.domain.popup.entity.enums.PopupLanguage;
import com.caskbycask.domain.popup.entity.enums.PopupType;

import java.time.LocalDateTime;

public record AdminPopupDetailResponse(
        Long id,
        String adminTitle,
        PopupType popupType,
        PopupLanguage language,
        PopupDisplayPage displayPage,
        // [보안] 관리자 전용: TipTap 에디터 편집을 위해 원본 content 포함.
        String content,
        String contentSanitized,
        String linkUrl,
        Boolean linkTargetBlank,
        Boolean isVisible,
        Integer sortOrder,
        Boolean closeOnOverlay,
        Boolean isAlwaysVisible,
        LocalDateTime startAt,
        LocalDateTime endAt,
        PopupResponse.PopupImageInfo mainImage,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AdminPopupDetailResponse from(Popup popup, PopupImage mainImage) {
        return new AdminPopupDetailResponse(
                popup.getId(),
                popup.getAdminTitle(),
                popup.getPopupType(),
                popup.getLanguage(),
                popup.getDisplayPage(),
                popup.getContent(),
                popup.getContentSanitized(),
                popup.getLinkUrl(),
                popup.getLinkTargetBlank(),
                popup.getIsVisible(),
                popup.getSortOrder(),
                popup.getCloseOnOverlay(),
                popup.getIsAlwaysVisible(),
                popup.getStartAt(),
                popup.getEndAt(),
                mainImage != null ? PopupResponse.PopupImageInfo.from(mainImage) : null,
                popup.getCreatedAt(),
                popup.getUpdatedAt()
        );
    }
}
