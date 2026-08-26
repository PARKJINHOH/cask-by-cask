package com.caskbycask.domain.translation.dto;

import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;

import java.util.Map;

public record TranslationResponse(
        TranslationResourceType resourceType,
        Long resourceId,
        TranslationLanguage targetLanguage,
        Map<String, String> fields
) {}
