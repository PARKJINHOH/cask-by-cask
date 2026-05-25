package com.drinkindex.domain.faq.dto;

import com.drinkindex.domain.faq.entity.Faq;
import com.drinkindex.domain.faq.entity.enums.FaqCategory;
import com.drinkindex.domain.faq.entity.enums.FaqLanguage;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class AdminFaqListResponse {
    private final Long id;
    private final FaqLanguage language;
    private final FaqCategory category;
    private final String categoryLabel;
    private final String question;
    private final Integer sortOrder;
    private final Boolean isActive;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public AdminFaqListResponse(Faq faq) {
        this.id = faq.getId();
        this.language = faq.getLanguage();
        this.category = faq.getCategory();
        this.categoryLabel = faq.getLanguage() == FaqLanguage.EN
                ? faq.getCategory().getLabelEn()
                : faq.getCategory().getLabelKo();
        this.question = faq.getQuestion();
        this.sortOrder = faq.getSortOrder();
        this.isActive = faq.getIsActive();
        this.createdAt = faq.getCreatedAt();
        this.updatedAt = faq.getUpdatedAt();
    }
}
