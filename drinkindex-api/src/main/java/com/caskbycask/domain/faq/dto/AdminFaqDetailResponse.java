package com.caskbycask.domain.faq.dto;

import com.caskbycask.domain.faq.entity.Faq;
import com.caskbycask.domain.faq.entity.enums.FaqCategory;
import com.caskbycask.domain.faq.entity.enums.FaqLanguage;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class AdminFaqDetailResponse {
    private final Long id;
    private final FaqLanguage language;
    private final FaqCategory category;
    private final String question;
    private final String answer;
    private final Integer sortOrder;
    private final Boolean isActive;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public AdminFaqDetailResponse(Faq faq) {
        this.id = faq.getId();
        this.language = faq.getLanguage();
        this.category = faq.getCategory();
        this.question = faq.getQuestion();
        this.answer = faq.getAnswer();
        this.sortOrder = faq.getSortOrder();
        this.isActive = faq.getIsActive();
        this.createdAt = faq.getCreatedAt();
        this.updatedAt = faq.getUpdatedAt();
    }
}
