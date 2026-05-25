package com.drinkindex.domain.faq.dto;

import com.drinkindex.domain.faq.entity.enums.FaqCategory;
import lombok.Getter;

import java.util.List;

@Getter
public class FaqGroupResponse {
    private final String category;
    private final String categoryLabel;
    private final List<FaqItemResponse> items;

    public FaqGroupResponse(FaqCategory category, String lang, List<FaqItemResponse> items) {
        this.category = category.name();
        this.categoryLabel = "en".equalsIgnoreCase(lang) ? category.getLabelEn() : category.getLabelKo();
        this.items = items;
    }
}
