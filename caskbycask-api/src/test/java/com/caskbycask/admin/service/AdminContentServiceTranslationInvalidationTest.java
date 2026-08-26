package com.caskbycask.admin.service;

import com.caskbycask.domain.comment.repository.CommentRepository;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.review.service.ReviewImageService;
import com.caskbycask.domain.review.service.ReviewService;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.translation.service.TranslationCacheInvalidator;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.email.EmailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminContentServiceTranslationInvalidationTest {

    @Mock ReviewRepository reviewRepository;
    @Mock ReviewImageService reviewImageService;
    @Mock CommentRepository commentRepository;
    @Mock ReviewService reviewService;
    @Mock SocialPublishRequestService socialPublishRequestService;
    @Mock EmailSender emailSender;
    @Mock NotificationService notificationService;
    @Mock TranslationCacheInvalidator translationCacheInvalidator;
    @Mock Review review;
    @Mock Spirit spirit;
    @Mock User user;

    @InjectMocks AdminContentService service;

    @BeforeEach
    void setUp() {
        given(reviewRepository.findById(42L)).willReturn(Optional.of(review));
        given(review.getSpirit()).willReturn(spirit);
        given(review.getUser()).willReturn(user);
        given(review.getId()).willReturn(42L);
        given(spirit.getId()).willReturn(7L);
        given(spirit.getNameKo()).willReturn("공개 주류");
    }

    @Test
    void hideReviewInvalidatesTranslationCache() {
        service.hideReview(42L, null);

        verify(review).hide();
        verify(translationCacheInvalidator).invalidateReview(42L);
    }

    @Test
    void deleteReviewInvalidatesTranslationCache() {
        service.deleteReview(42L, null);

        verify(review).softDelete();
        verify(translationCacheInvalidator).invalidateReview(42L);
    }
}
