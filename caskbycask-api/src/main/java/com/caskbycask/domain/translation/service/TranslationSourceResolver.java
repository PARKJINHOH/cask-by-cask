package com.caskbycask.domain.translation.service;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.service.SpiritDetailService;
import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TranslationSourceResolver {

    private final SpiritRepository spiritRepository;
    private final SpiritDetailService spiritDetailService;
    private final ReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public Map<String, String> resolve(TranslationResourceType type, Long resourceId) {
        return switch (type) {
            case SPIRIT_NOTES -> resolveSpiritNotes(resourceId);
            case REVIEW -> resolveReview(resourceId);
        };
    }

    private Map<String, String> resolveSpiritNotes(Long spiritId) {
        Spirit spirit = spiritRepository.findByIdWithAllDetails(spiritId, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        putNormalized(fields, "notes", spiritDetailService.extractNotes(spirit));
        return fields;
    }

    private Map<String, String> resolveReview(Long reviewId) {
        Review review = reviewRepository.findPublicById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        putNormalized(fields, "noseNote", review.getNoseNote());
        putNormalized(fields, "tasteNote", review.getTasteNote());
        putNormalized(fields, "finishNote", review.getFinishNote());
        putNormalized(fields, "comment", review.getComment());
        return fields;
    }

    private void putNormalized(Map<String, String> fields, String key, String value) {
        fields.put(key, value == null || value.isBlank() ? "" : value);
    }
}
