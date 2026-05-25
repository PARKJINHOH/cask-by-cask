package com.drinkindex.domain.faq.dto;

import com.drinkindex.domain.faq.entity.enums.FaqCategory;
import com.drinkindex.domain.faq.entity.enums.FaqLanguage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateFaqRequest {

    @NotNull
    private FaqLanguage language;

    @NotNull
    private FaqCategory category;

    @NotBlank
    @Size(max = 500)
    private String question;

    @NotBlank
    private String answer;

    @NotNull
    private Integer sortOrder;

    private Boolean isActive = true;
}
