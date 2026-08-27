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
import com.caskbycask.global.util.HtmlSanitizer;
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
    private final HtmlSanitizer htmlSanitizer;

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
        putNormalized(fields, "comment", toTranslationSource(review.getComment()));
        return fields;
    }

    /**
     * 종합평가는 제한형 에디터의 HTML 로 저장된다. Google 번역 호출이 {@code format=text} 라
     * 태그를 그대로 보내면 번역문에 태그가 글자로 남고 문자 쿼터도 그만큼 더 쓴다.
     *
     * <p>에디터 도입 이전 리뷰(순수 텍스트)는 손대지 않는다 — 건드리면 sourceHash 가 바뀌어
     * 이미 채워 둔 번역 캐시가 통째로 무효가 된다.
     */
    private String toTranslationSource(String comment) {
        if (comment == null || comment.indexOf('<') < 0) return comment;
        return htmlSanitizer.sanitizeToPlainText(comment);
    }

    private void putNormalized(Map<String, String> fields, String key, String value) {
        fields.put(key, value == null || value.isBlank() ? "" : value);
    }
}
