package com.caskbycask.domain.translation.dto;

import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record TranslationRequest(
        @NotNull TranslationResourceType resourceType,
        @NotNull @Positive Long resourceId,
        @NotNull TranslationLanguage targetLanguage
) {}
