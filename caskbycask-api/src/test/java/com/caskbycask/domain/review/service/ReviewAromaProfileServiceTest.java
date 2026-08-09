package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.AromaProfileItemRequest;
import com.caskbycask.domain.review.dto.AromaProfileRequest;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.entity.ReviewAromaProfile;
import com.caskbycask.domain.review.entity.ReviewAromaProfileItem;
import com.caskbycask.domain.review.entity.SpiritVariantReviewRequest;
import com.caskbycask.domain.review.entity.enums.AromaProfilePhase;
import com.caskbycask.domain.review.entity.enums.AromaType;
import com.caskbycask.domain.review.repository.ReviewAromaProfileRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ReviewAromaProfileServiceTest {

    @Mock
    private ReviewAromaProfileRepository profileRepository;

    private ReviewAromaProfileService service;
    private Review whiskyReview;

    @BeforeEach
    void setUp() {
        service = new ReviewAromaProfileService(profileRepository);
        whiskyReview = review(SpiritCategory.WHISKY);
    }

    @Test
    void savesThreeToEightItemSubsetInRequestOrder() {
        given(profileRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        AromaProfileRequest profile = profile(
                item(AromaType.CUSTOM, "바닐라", 5),
                item(AromaType.CUSTOM, "후추", 3),
                item(AromaType.ID, "oak", 4));

        var result = service.replaceForReview(
                whiskyReview,
                List.of(profile),
                "c:%EB%B0%94%EB%8B%90%EB%9D%BC,c:%ED%9B%84%EC%B6%94,oak,c:%EC%82%AC%EA%B3%BC",
                null,
                null);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().items())
                .extracting(item -> item.labelSnapshot())
                .containsExactly("바닐라", "후추", "Oak");
        verify(profileRepository).deleteByReviewId(10L);
        verify(profileRepository).saveAll(anyList());
    }

    @Test
    void nullOnReviewUpdateKeepsExistingProfiles() {
        given(profileRepository.findByReviewIds(List.of(10L))).willReturn(List.of());

        assertThat(service.replaceForReview(whiskyReview, null, null, null, null)).isEmpty();

        verify(profileRepository).findByReviewIds(List.of(10L));
    }

    @Test
    void nullOnReviewUpdateRejectsKeptProfileWhenItsAromaWasRemoved() {
        given(profileRepository.findByReviewIds(List.of(10L))).willReturn(List.of(storedProfile(
                whiskyReview,
                item(AromaType.CUSTOM, "a", 1),
                item(AromaType.CUSTOM, "b", 2),
                item(AromaType.CUSTOM, "c", 3))));

        assertError(
                () -> service.replaceForReview(whiskyReview, null, "c:a,c:b", null, null),
                ErrorCode.REVIEW_AROMA_PROFILE_INVALID);
    }

    @Test
    void emptyListDeletesAllProfiles() {
        assertThat(service.replaceForReview(whiskyReview, List.of(), null, null, null)).isEmpty();
        verify(profileRepository).deleteByReviewId(10L);
    }

    @Test
    void rejectsUnsupportedCategory() {
        Review wineReview = review(SpiritCategory.WINE);
        assertError(
                () -> service.replaceForReview(wineReview, List.of(profile(
                        item(AromaType.CUSTOM, "a", 1),
                        item(AromaType.CUSTOM, "b", 2),
                        item(AromaType.CUSTOM, "c", 3))), "c:a,c:b,c:c", null, null),
                ErrorCode.REVIEW_AROMA_PROFILE_UNSUPPORTED);
    }

    @Test
    void rejectsInvalidCountsIntensityDuplicateAndMissingAroma() {
        assertInvalid(profile(item(AromaType.CUSTOM, "a", 1), item(AromaType.CUSTOM, "b", 2)), "c:a,c:b");
        assertInvalid(profile(
                item(AromaType.CUSTOM, "a", 1), item(AromaType.CUSTOM, "b", 2),
                item(AromaType.CUSTOM, "c", 3), item(AromaType.CUSTOM, "d", 4),
                item(AromaType.CUSTOM, "e", 5), item(AromaType.CUSTOM, "f", 1),
                item(AromaType.CUSTOM, "g", 2), item(AromaType.CUSTOM, "h", 3),
                item(AromaType.CUSTOM, "i", 4)), "c:a,c:b,c:c,c:d,c:e,c:f,c:g,c:h,c:i");
        assertInvalid(profile(
                item(AromaType.CUSTOM, "a", 0), item(AromaType.CUSTOM, "b", 2), item(AromaType.CUSTOM, "c", 3)),
                "c:a,c:b,c:c");
        assertInvalid(profile(
                item(AromaType.CUSTOM, "a", 1), item(AromaType.CUSTOM, "a", 2), item(AromaType.CUSTOM, "c", 3)),
                "c:a,c:c");
        assertInvalid(profile(
                item(AromaType.CUSTOM, "a", 1), item(AromaType.CUSTOM, "b", 2), item(AromaType.CUSTOM, "missing", 3)),
                "c:a,c:b,c:c");
    }

    @Test
    void rejectsDuplicatePhase() {
        AromaProfileRequest profile = profile(
                item(AromaType.CUSTOM, "a", 1),
                item(AromaType.CUSTOM, "b", 2),
                item(AromaType.CUSTOM, "c", 3));

        assertError(
                () -> service.replaceForReview(
                        whiskyReview,
                        List.of(profile, profile),
                        "c:a,c:b,c:c",
                        null,
                        null),
                ErrorCode.REVIEW_AROMA_PROFILE_INVALID);
    }

    @Test
    void transfersVariantRequestProfilesToApprovedReview() {
        SpiritVariantReviewRequest variantRequest = SpiritVariantReviewRequest.builder()
                .masterSpirit(whiskyReview.getSpirit())
                .requestUser(whiskyReview.getUser())
                .variantType(VariantType.BATCH)
                .variantValue("Batch 1")
                .noseScore(BigDecimal.valueOf(80))
                .tasteScore(BigDecimal.valueOf(80))
                .finishScore(BigDecimal.valueOf(80))
                .build();
        ReflectionTestUtils.setField(variantRequest, "id", 20L);
        ReviewAromaProfile stored = ReviewAromaProfile.builder()
                .variantReviewRequest(variantRequest)
                .phase(AromaProfilePhase.NOSE)
                .schemaVersion(1)
                .build();
        given(profileRepository.findByVariantRequestIds(List.of(20L))).willReturn(List.of(stored));

        service.transferToReview(variantRequest, whiskyReview);

        assertThat(stored.getReview()).isSameAs(whiskyReview);
        assertThat(stored.getVariantReviewRequest()).isNull();
    }

    private void assertInvalid(AromaProfileRequest profile, String notes) {
        assertError(
                () -> service.replaceForReview(whiskyReview, List.of(profile), notes, null, null),
                ErrorCode.REVIEW_AROMA_PROFILE_INVALID);
    }

    private void assertError(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }

    private AromaProfileRequest profile(AromaProfileItemRequest... items) {
        return new AromaProfileRequest(AromaProfilePhase.NOSE, 1, List.of(items));
    }

    private AromaProfileItemRequest item(AromaType type, String key, int intensity) {
        String label = type == AromaType.ID ? "Oak" : key;
        return new AromaProfileItemRequest(type, key, label, intensity);
    }

    private ReviewAromaProfile storedProfile(Review review, AromaProfileItemRequest... items) {
        ReviewAromaProfile profile = ReviewAromaProfile.builder()
                .review(review)
                .phase(AromaProfilePhase.NOSE)
                .schemaVersion(1)
                .build();
        for (int index = 0; index < items.length; index++) {
            AromaProfileItemRequest item = items[index];
            profile.addItem(ReviewAromaProfileItem.builder()
                    .aromaType(item.aromaType())
                    .aromaKey(item.aromaKey())
                    .labelSnapshot(item.labelSnapshot())
                    .intensity(item.intensity())
                    .sortOrder(index)
                    .build());
        }
        return profile;
    }

    private Review review(SpiritCategory category) {
        Spirit spirit = Spirit.builder().nameKo("테스트").nameEn("Test").category(category).build();
        ReflectionTestUtils.setField(spirit, "id", 1L);
        User user = User.builder().email("profile@example.com").nickname("프로필").role(Role.MEMBER).build();
        ReflectionTestUtils.setField(user, "id", 1L);
        Review review = Review.builder()
                .spirit(spirit)
                .user(user)
                .noseScore(BigDecimal.valueOf(80))
                .tasteScore(BigDecimal.valueOf(80))
                .finishScore(BigDecimal.valueOf(80))
                .build();
        ReflectionTestUtils.setField(review, "id", 10L);
        return review;
    }
}
