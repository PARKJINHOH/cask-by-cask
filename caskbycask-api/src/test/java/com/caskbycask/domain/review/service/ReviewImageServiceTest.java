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
import com.caskbycask.global.util.NoticeImageValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
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
    // 판별 로직 자체가 검증 대상이라 진짜 구현을 넣는다 — 스텁하면 매직바이트 판정을 확인할 수 없다.
    @Spy
    private NoticeImageValidator imageValidator = new NoticeImageValidator();
    @InjectMocks
    private ReviewImageService service;

    // --- 이름이 아니라 내용으로 판정한다 ---------------------------------------------------

    @Test
    void acceptsPhotoWhoseNameWasChangedByAMessenger() {
        // 카톡을 거치며 .png 로 이름만 바뀐 JPEG — 예전에는 "업로드 실패" 였다.
        assertThat(detectedMimeOf(jpeg("IMG_4821.png", "image/png"))).isEqualTo("image/jpeg");
    }

    @Test
    void acceptsPhotoWithoutAnyExtension() {
        assertThat(detectedMimeOf(png("screenshot", null))).isEqualTo("image/png");
    }

    @Test
    void acceptsJfifWhichWindowsHandsOverAsAnUnfamiliarExtension() {
        assertThat(detectedMimeOf(jpeg("photo.jfif", "image/jpeg"))).isEqualTo("image/jpeg");
    }

    @Test
    void ignoresBrowserSuppliedContentTypeEntirely() {
        // 브라우저가 엉뚱한 Content-Type 을 붙여도 내용이 PNG 면 PNG 다.
        assertThat(detectedMimeOf(png("proof.png", "application/octet-stream"))).isEqualTo("image/png");
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

    /** 저장명은 원본 이름과 무관한 UUID + .webp 다 — 확장자 스푸핑이 성립할 여지가 없다. */
    @Test
    void namesStoredFileByUuidRegardlessOfTheOriginalName() {
        MultipartFile disguised = png("evil.php.png", "image/png");
        given(fileStorageService.uploadImage(
                any(), anyString(), anyString(), anyString(), any(WebpConversionMode.class), eq(true)))
                .willReturn(new ImageUploadResult(
                        "fixed.webp", "image/webp", "/api/reviews/images/fixed.webp"));
        given(imageRepository.save(any(ReviewImage.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        service.saveForReview(review(1L), List.of(disguised));

        ArgumentCaptor<String> savedName = ArgumentCaptor.forClass(String.class);
        verify(fileStorageService).uploadImage(
                any(), savedName.capture(), anyString(), anyString(),
                any(WebpConversionMode.class), eq(true));
        assertThat(savedName.getValue()).endsWith(".webp").doesNotContain("evil");
    }

    // --- 거절할 때는 왜 거절인지 남긴다 -----------------------------------------------------

    @Test
    void rejectsHeicWithItsOwnReason() {
        assertRejected(isoBmff("IMG_0001.HEIC", "heic"), ErrorCode.REVIEW_IMAGE_HEIC_UNSUPPORTED);
    }

    @Test
    void rejectsAvifBecauseTheForcedWebpReencodeHasNoDecoderForIt() {
        assertRejected(isoBmff("photo.avif", "avif"), ErrorCode.REVIEW_IMAGE_AVIF_UNSUPPORTED);
    }

    @Test
    void rejectsSvgWithItsOwnReason() {
        MultipartFile svg = new MockMultipartFile(
                "images", "logo.svg", "image/svg+xml",
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><script/></svg>".getBytes(StandardCharsets.UTF_8));

        assertRejected(svg, ErrorCode.REVIEW_IMAGE_SVG_UNSUPPORTED);
    }

    @Test
    void rejectsTiffWithItsOwnReason() {
        MultipartFile tiff = new MockMultipartFile(
                "images", "scan.tiff", "image/tiff", new byte[]{0x49, 0x49, 0x2A, 0x00, 0, 0, 0, 0});

        assertRejected(tiff, ErrorCode.REVIEW_IMAGE_TIFF_UNSUPPORTED);
    }

    @Test
    void rejectsSomethingThatIsNotAnImageAtAll() {
        MultipartFile text = new MockMultipartFile(
                "images", "notes.png", "image/png",
                "이건 이미지가 아니라 그냥 텍스트다".getBytes(StandardCharsets.UTF_8));

        assertRejected(text, ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
    }

    /** 헤더는 PNG 인데 본문이 깨진 파일 — "형식이 아니다" 가 아니라 "손상됐다" 로 알려야 한다. */
    @Test
    void reportsCorruptFileAsUnreadableRatherThanWrongFormat() {
        byte[] truncated = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};
        MultipartFile corrupt = new MockMultipartFile("images", "broken.png", "image/png", truncated);

        assertRejected(corrupt, ErrorCode.REVIEW_IMAGE_UNREADABLE);
    }

    @Test
    void rejectsEmptyFile() {
        assertRejected(new MockMultipartFile("images", "empty.png", "image/png", new byte[0]),
                ErrorCode.REVIEW_IMAGE_EMPTY);
    }

    // --- 리뷰 고유의 한도는 그대로 -----------------------------------------------------------

    @Test
    void rejectsMoreThanThreeImagesBeforeStorage() {
        MultipartFile image = png("proof.png", "image/png");

        assertError(
                () -> service.saveForReview(review(1L), List.of(image, image, image, image)),
                ErrorCode.REVIEW_IMAGE_LIMIT_EXCEEDED);
        verifyNothingStored();
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

    // --- helpers ----------------------------------------------------------------------------

    /** 업로드까지 태운 뒤, 내용에서 판별해 스토리지로 넘긴 MIME 을 돌려준다. */
    private String detectedMimeOf(MultipartFile file) {
        given(fileStorageService.uploadImage(
                any(), anyString(), anyString(), anyString(), any(WebpConversionMode.class), eq(true)))
                .willReturn(new ImageUploadResult(
                        "fixed.webp", "image/webp", "/api/reviews/images/fixed.webp"));
        given(imageRepository.save(any(ReviewImage.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        service.saveForReview(review(1L), List.of(file));

        ArgumentCaptor<String> mimeType = ArgumentCaptor.forClass(String.class);
        verify(fileStorageService).uploadImage(
                any(), anyString(), anyString(), mimeType.capture(),
                any(WebpConversionMode.class), eq(true));
        return mimeType.getValue();
    }

    private void assertRejected(MultipartFile file, ErrorCode expected) {
        assertError(() -> service.saveForReview(review(1L), List.of(file)), expected);
        verifyNothingStored();
    }

    private void verifyNothingStored() {
        verify(fileStorageService, never())
                .uploadImage(any(), anyString(), anyString(), anyString(),
                        any(WebpConversionMode.class), eq(true));
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
        return encoded("png", fileName, contentType);
    }

    private static MockMultipartFile jpeg(String fileName, String contentType) {
        return encoded("jpg", fileName, contentType);
    }

    /** 픽셀 검사까지 통과해야 하므로 진짜로 디코딩되는 이미지를 만든다. */
    private static MockMultipartFile encoded(String format, String fileName, String contentType) {
        try {
            BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, format, output);
            return new MockMultipartFile("images", fileName, contentType, output.toByteArray());
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    /** AVIF·HEIC 는 같은 ISO-BMFF 컨테이너를 쓰고 offset 8 의 브랜드 4글자로만 갈린다. */
    private static MockMultipartFile isoBmff(String fileName, String brand) {
        byte[] header = new byte[16];
        System.arraycopy(new byte[]{0, 0, 0, 0x20, 'f', 't', 'y', 'p'}, 0, header, 0, 8);
        System.arraycopy(brand.getBytes(StandardCharsets.US_ASCII), 0, header, 8, 4);
        return new MockMultipartFile("images", fileName, null, header);
    }

    private static void assertError(Runnable action, ErrorCode expected) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(expected));
    }
}
