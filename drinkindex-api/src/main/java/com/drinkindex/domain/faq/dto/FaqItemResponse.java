package com.drinkindex.domain.faq.dto;

import com.drinkindex.domain.faq.entity.Faq;
import lombok.Getter;

@Getter
public class FaqItemResponse {
    private final Long id;
    private final String question;
    private final String answer;
    private final Integer sortOrder;

    public FaqItemResponse(Faq faq) {
        this.id = faq.getId();
        this.question = faq.getQuestion();
        this.answer = faq.getAnswer();
        this.sortOrder = faq.getSortOrder();
    }
}
