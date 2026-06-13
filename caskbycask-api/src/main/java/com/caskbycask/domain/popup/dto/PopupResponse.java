package com.caskbycask.domain.popup.dto;

import com.caskbycask.domain.popup.entity.Popup;
import com.caskbycask.domain.popup.entity.PopupImage;
import com.caskbycask.domain.popup.entity.enums.PopupLanguage;
import com.caskbycask.domain.popup.entity.enums.PopupType;

public record PopupResponse(
        Long id,
        PopupType popupType,
        PopupLanguage language,
        // [보안] XSS: HTML형만 포함. content 원본 절대 미반환.
        String contentSanitized,
        PopupImageInfo mainImage,
        String linkUrl,
        Boolean linkTargetBlank,
        Boolean closeOnOverlay,
        Integer sortOrder
) {
    public record PopupImageInfo(String imageUrl, String originalFileName) {
        public static PopupImageInfo from(PopupImage image) {
            return new PopupImageInfo(image.getImageUrl(), image.getOriginalFileName());
        }
    }

    public static PopupResponse from(Popup popup, PopupImage mainImage) {
        return new PopupResponse(
                popup.getId(),
                popup.getPopupType(),
                popup.getLanguage(),
                PopupType.HTML.equals(popup.getPopupType()) ? popup.getContentSanitized() : null,
                (mainImage != null) ? PopupImageInfo.from(mainImage) : null,
                PopupType.IMAGE.equals(popup.getPopupType()) ? popup.getLinkUrl() : null,
                PopupType.IMAGE.equals(popup.getPopupType()) ? popup.getLinkTargetBlank() : null,
                popup.getCloseOnOverlay(),
                popup.getSortOrder()
        );
    }
}
