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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class TranslationSourceResolverTest {

    @Mock SpiritRepository spiritRepository;
    @Mock SpiritDetailService spiritDetailService;
    @Mock ReviewRepository reviewRepository;
    @Mock Review review;
    @Mock Spirit spirit;

    @Test
    void reviewUsesOnlyPublicRepositoryAndPreservesFixedFieldOrder() {
        given(reviewRepository.findPublicById(10L)).willReturn(Optional.of(review));
        given(review.getNoseNote()).willReturn("꽃 향");
        given(review.getTasteNote()).willReturn(" ");
        given(review.getFinishNote()).willReturn(null);
        given(review.getComment()).willReturn("좋아요");
        TranslationSourceResolver resolver = resolver();

        Map<String, String> fields = resolver.resolve(TranslationResourceType.REVIEW, 10L);

        assertThat(fields).containsExactly(
                Map.entry("noseNote", "꽃 향"),
                Map.entry("tasteNote", ""),
                Map.entry("finishNote", ""),
                Map.entry("comment", "좋아요"));
    }

    @Test
    void spiritUsesActiveLookupAndCategoryNotesExtractor() {
        given(spiritRepository.findByIdWithAllDetails(20L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(spiritDetailService.extractNotes(spirit)).willReturn("기타 소개");

        Map<String, String> fields = resolver().resolve(TranslationResourceType.SPIRIT_NOTES, 20L);

        assertThat(fields).containsExactly(Map.entry("notes", "기타 소개"));
    }

    @Test
    void hiddenOrDeletedReviewIsIndistinguishableFromNotFound() {
        given(reviewRepository.findPublicById(10L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> resolver().resolve(TranslationResourceType.REVIEW, 10L))
                .isInstanceOf(CustomException.class)
                .extracting(error -> ((CustomException) error).getErrorCode())
                .isEqualTo(ErrorCode.REVIEW_NOT_FOUND);
    }

    private TranslationSourceResolver resolver() {
        return new TranslationSourceResolver(spiritRepository, spiritDetailService, reviewRepository);
    }
}
