package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.ReviewImagePlanItem;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.entity.ReviewImage;
import com.caskbycask.domain.review.repository.ReviewImageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ImageUploadResult;
import com.caskbycask.global.storage.WebpConversionMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ReviewImageServiceTest {

    @Mock
    private ReviewImageRepository imageRepository;
    @Mock
    private FileStorageService fileStorageService;
    @InjectMocks
    private ReviewImageService service;

    @Test
    void rejectsMoreThanThreeImagesBeforeStorage() {
        MultipartFile image = png("proof.png", "image/png");

        assertError(
                () -> service.saveForReview(review(1L), List.of(image, image, image, image)),
                ErrorCode.REVIEW_IMAGE_LIMIT_EXCEEDED);
        verify(fileStorageService, never())
                .uploadImage(any(), anyString(), anyString(), anyString(),
                        any(WebpConversionMode.class), eq(true));
    }

    @Test
    void rejectsWhenExtensionReportedMimeAndMagicBytesDoNotAgree() {
        MultipartFile forged = png("proof.jpg", "image/jpeg");

        assertError(
                () -> service.saveForReview(review(1L), List.of(forged)),
                ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
        verify(fileStorageService, never())
                .uploadImage(any(), anyString(), anyString(), anyString(),
                        any(WebpConversionMode.class), eq(true));
    }

    @Test
    void rejectsFileLargerThanTenMegabytesBeforeReadingIt() {
        MultipartFile oversized = org.mockito.Mockito.mock(MultipartFile.class);
        given(oversized.isEmpty()).willReturn(false);
        given(oversized.getSize()).willReturn(10L * 1024 * 1024 + 1);

        assertError(
                () -> service.saveForReview(review(1L), List.of(oversized)),
                ErrorCode.REVIEW_IMAGE_SIZE_EXCEEDED);
    }

    @Test
    void storesOnlyReencodedWebpMetadata() {
        Review review = review(1L);
        MultipartFile image = png("proof.png", "image/png");
        given(fileStorageService.uploadImage(
                eq(image), anyString(), anyString(), eq("image/png"),
                eq(WebpConversionMode.LOSSY), eq(true)))
                .willReturn(new ImageUploadResult(
                        "fixed.webp", "image/webp", "/api/reviews/images/fixed.webp"));
        given(imageRepository.save(any(ReviewImage.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        List<ReviewImage> saved = service.saveForReview(review, List.of(image));

        assertThat(saved).hasSize(1);
        assertThat(saved.getFirst().getReview()).isSameAs(review);
        assertThat(saved.getFirst().getMimeType()).isEqualTo("image/webp");
        assertThat(saved.getFirst().getSavedFileName()).isEqualTo("fixed.webp");
        assertThat(saved.getFirst().getSortOrder()).isZero();
    }

    @Test
    void rejectsImageIdThatDoesNotBelongToTheTargetReview() {
        Review review = review(1L);
        ReviewImage owned = existingImage(10L, review, 0);
        given(imageRepository.findByReviewIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(List.of(owned));

        assertError(
                () -> service.replaceForReview(
                        review, List.of(new ReviewImagePlanItem(999L, null)), List.of()),
                ErrorCode.REVIEW_IMAGE_PLAN_INVALID);
    }

    @Test
    void appliesPlanOrderToExistingImages() {
        Review review = review(1L);
        ReviewImage first = existingImage(10L, review, 0);
        ReviewImage second = existingImage(20L, review, 1);
        given(imageRepository.findByReviewIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(List.of(first, second));

        List<ReviewImage> result = service.replaceForReview(
                review,
                List.of(
                        new ReviewImagePlanItem(20L, null),
                        new ReviewImagePlanItem(10L, null)),
                List.of());

        assertThat(result).containsExactly(second, first);
        assertThat(second.getSortOrder()).isZero();
        assertThat(first.getSortOrder()).isEqualTo(1);
        verify(imageRepository).flush();
    }

    private static Review review(Long id) {
        Review review = Review.builder().build();
        ReflectionTestUtils.setField(review, "id", id);
        return review;
    }

    private static ReviewImage existingImage(Long id, Review review, int sortOrder) {
        return ReviewImage.builder()
                .id(id)
                .review(review)
                .savedFileName(id + ".webp")
                .subPath("reviews/202607")
                .mimeType("image/webp")
                .imageUrl("/api/reviews/images/" + id + ".webp")
                .sortOrder(sortOrder)
                .build();
    }

    private static MockMultipartFile png(String fileName, String contentType) {
        try {
            BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return new MockMultipartFile("images", fileName, contentType, output.toByteArray());
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    private static void assertError(Runnable action, ErrorCode expected) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(expected));
    }
}
