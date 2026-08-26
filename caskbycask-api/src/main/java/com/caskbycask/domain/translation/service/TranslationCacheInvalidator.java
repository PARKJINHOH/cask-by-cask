package com.caskbycask.domain.translation.service;

import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TranslationCacheInvalidator {

    private final TranslationCacheStore cacheStore;

    public void invalidateReview(Long reviewId) {
        cacheStore.invalidate(TranslationResourceType.REVIEW, reviewId);
    }

    public void invalidateSpirit(Long spiritId) {
        cacheStore.invalidate(TranslationResourceType.SPIRIT_NOTES, spiritId);
    }
}
