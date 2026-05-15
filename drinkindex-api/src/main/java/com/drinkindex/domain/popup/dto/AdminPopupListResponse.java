package com.drinkindex.domain.popup.dto;

import com.drinkindex.domain.popup.entity.Popup;
import com.drinkindex.domain.popup.entity.enums.PopupDisplayPage;
import com.drinkindex.domain.popup.entity.enums.PopupLanguage;
import com.drinkindex.domain.popup.entity.enums.PopupType;

import java.time.LocalDateTime;

public record AdminPopupListResponse(
        Long id,
        String adminTitle,
        PopupType popupType,
        PopupLanguage language,
        Boolean isVisible,
        Integer sortOrder,
        Boolean isAlwaysVisible,
        LocalDateTime startAt,
        LocalDateTime endAt,
        PopupDisplayPage displayPage,
        LocalDateTime createdAt
) {
    public static AdminPopupListResponse from(Popup popup) {
        return new AdminPopupListResponse(
                popup.getId(),
                popup.getAdminTitle(),
                popup.getPopupType(),
                popup.getLanguage(),
                popup.getIsVisible(),
                popup.getSortOrder(),
                popup.getIsAlwaysVisible(),
                popup.getStartAt(),
                popup.getEndAt(),
                popup.getDisplayPage(),
                popup.getCreatedAt()
        );
    }
}
