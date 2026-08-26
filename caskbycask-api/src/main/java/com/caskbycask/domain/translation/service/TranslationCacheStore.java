package com.caskbycask.domain.translation.service;

import com.caskbycask.domain.translation.entity.ContentTranslationCache;
import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;
import com.caskbycask.domain.translation.repository.ContentTranslationCacheRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TranslationCacheStore {

    private final ContentTranslationCacheRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Optional<Map<String, String>> find(TranslationResourceType type, Long resourceId,
                                              TranslationLanguage language, String sourceHash) {
        return repository.findByResourceTypeAndResourceIdAndTargetLanguage(type, resourceId, language)
                .filter(row -> sourceHash.equals(row.getSourceHash()))
                .map(row -> deserialize(row.getTranslatedFields()));
    }

    @Transactional
    public Map<String, String> save(TranslationResourceType type, Long resourceId,
                                    TranslationLanguage language, String sourceHash,
                                    Map<String, String> translatedFields) {
        String payload = serialize(translatedFields);
        ContentTranslationCache row = repository
                .findByResourceTypeAndResourceIdAndTargetLanguage(type, resourceId, language)
                .orElseGet(() -> ContentTranslationCache.builder()
                        .resourceType(type)
                        .resourceId(resourceId)
                        .targetLanguage(language)
                        .sourceHash(sourceHash)
                        .translatedFields(payload)
                        .build());
        row.replace(sourceHash, payload);
        repository.save(row);
        return Collections.unmodifiableMap(new LinkedHashMap<>(translatedFields));
    }

    @Transactional
    public void invalidate(TranslationResourceType type, Long resourceId) {
        repository.deleteByResource(type, resourceId);
    }

    private String serialize(Map<String, String> fields) {
        try {
            return objectMapper.writeValueAsString(fields);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
        }
    }

    private Map<String, String> deserialize(String payload) {
        try {
            Map<String, String> fields = objectMapper.readValue(
                    payload, new TypeReference<LinkedHashMap<String, String>>() {});
            return Collections.unmodifiableMap(fields);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
        }
    }
}
