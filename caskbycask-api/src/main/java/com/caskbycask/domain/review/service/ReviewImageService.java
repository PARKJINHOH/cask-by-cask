package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.ReviewImagePlanItem;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.entity.ReviewImage;
import com.caskbycask.domain.review.entity.SpiritVariantReviewRequest;
import com.caskbycask.domain.review.repository.ReviewImageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ImageUploadResult;
import com.caskbycask.global.storage.WebpConversionMode;
import com.caskbycask.global.util.AllowedImageFormat;
import com.caskbycask.global.util.NoticeImageValidator;
import com.sksamuel.scrimage.ImmutableImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReviewImageService {

    public static final int MAX_IMAGES = 3;
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final long MAX_TOTAL_SIZE = 30L * 1024 * 1024;
    private static final long MAX_PIXELS = 40_000_000L;
    private static final DateTimeFormatter MONTH_DIR = DateTimeFormatter.ofPattern("yyyyMM");

    /**
     * 리뷰 사진은 저장 전에 <b>반드시</b> WebP 로 다시 인코딩한다(EXIF·원본 미보관).
     * 그래서 재인코딩을 통과하지 못하는 포맷은 받아 봐야 저장 단계에서 터진다 —
     * AVIF 는 서버에 디코더가 없어(WebpConversionService 참고) 여기서 미리, 사유를 밝혀 거절한다.
     * 나머지는 공용 표({@link AllowedImageFormat})를 그대로 따른다.
     */
    private static final Set<AllowedImageFormat> SUPPORTED_FORMATS =
            EnumSet.complementOf(EnumSet.of(AllowedImageFormat.AVIF));

    private final ReviewImageRepository imageRepository;
    private final FileStorageService fileStorageService;
    private final NoticeImageValidator imageValidator;

    public List<ReviewImage> findByReviewId(Long reviewId) {
        return imageRepository.findByReviewIdOrderBySortOrderAscIdAsc(reviewId);
    }

    public List<ReviewImage> findByVariantRequestId(Long requestId) {
        return imageRepository.findByVariantReviewRequestIdOrderBySortOrderAscIdAsc(requestId);
    }

    public Map<Long, List<ReviewImage>> findByReviewIds(Collection<Long> reviewIds) {
        if (reviewIds == null || reviewIds.isEmpty()) return Map.of();
        Map<Long, List<ReviewImage>> grouped = new HashMap<>();
        for (ReviewImage image : imageRepository.findByReviewIds(reviewIds)) {
            grouped.computeIfAbsent(image.getReview().getId(), ignored -> new ArrayList<>()).add(image);
        }
        return grouped;
    }

    public Map<Long, List<ReviewImage>> findByVariantRequestIds(Collection<Long> requestIds) {
        if (requestIds == null || requestIds.isEmpty()) return Map.of();
        Map<Long, List<ReviewImage>> grouped = new HashMap<>();
        for (ReviewImage image : imageRepository.findByVariantReviewRequestIds(requestIds)) {
            grouped.computeIfAbsent(
                    image.getVariantReviewRequest().getId(), ignored -> new ArrayList<>())
                    .add(image);
        }
        return grouped;
    }

    public List<ReviewImage> saveForReview(Review review, List<MultipartFile> files) {
        List<MultipartFile> normalized = normalizeFiles(files);
        validateFiles(normalized);
        List<ReviewImage> saved = new ArrayList<>();
        for (int index = 0; index < normalized.size(); index++) {
            saved.add(store(normalized.get(index), review, null, index));
        }
        return saved;
    }

    public List<ReviewImage> saveForVariantRequest(SpiritVariantReviewRequest request,
                                                    List<MultipartFile> files) {
        List<MultipartFile> normalized = normalizeFiles(files);
        validateFiles(normalized);
        List<ReviewImage> saved = new ArrayList<>();
        for (int index = 0; index < normalized.size(); index++) {
            saved.add(store(normalized.get(index), null, request, index));
        }
        return saved;
    }

    public List<ReviewImage> replaceForReview(Review review,
                                               List<ReviewImagePlanItem> plan,
                                               List<MultipartFile> newFiles) {
        if (plan == null) {
            if (!normalizeFiles(newFiles).isEmpty()) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_PLAN_INVALID);
            }
            return findByReviewId(review.getId());
        }
        return replace(review, null, plan, newFiles);
    }

    public List<ReviewImage> replaceForVariantRequest(SpiritVariantReviewRequest request,
                                                       List<ReviewImagePlanItem> plan,
                                                       List<MultipartFile> newFiles) {
        if (plan == null) {
            if (!normalizeFiles(newFiles).isEmpty()) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_PLAN_INVALID);
            }
            return findByVariantRequestId(request.getId());
        }
        return replace(null, request, plan, newFiles);
    }

    public void transferToReview(Long requestId, Review review) {
        List<ReviewImage> images = findByVariantRequestId(requestId);
        for (int index = 0; index < images.size(); index++) {
            images.get(index).bindToReview(review, index);
        }
    }

    public void deleteForReview(Long reviewId) {
        deleteImages(findByReviewId(reviewId));
    }

    public void deleteForVariantRequest(Long requestId) {
        deleteImages(findByVariantRequestId(requestId));
    }

    private List<ReviewImage> replace(Review review,
                                      SpiritVariantReviewRequest request,
                                      List<ReviewImagePlanItem> plan,
                                      List<MultipartFile> newFiles) {
        if (plan.size() > MAX_IMAGES) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_LIMIT_EXCEEDED);
        }

        List<MultipartFile> normalizedFiles = normalizeFiles(newFiles);
        validateFiles(normalizedFiles);
        List<ReviewImage> existing = review != null
                ? findByReviewId(review.getId())
                : findByVariantRequestId(request.getId());
        Map<Long, ReviewImage> byId = new HashMap<>();
        existing.forEach(image -> byId.put(image.getId(), image));

        Set<Long> retainedIds = new HashSet<>();
        Set<Integer> usedFileIndexes = new HashSet<>();
        for (ReviewImagePlanItem item : plan) {
            boolean existingItem = item != null && item.imageId() != null;
            boolean newItem = item != null && item.fileIndex() != null;
            if (existingItem == newItem) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_PLAN_INVALID);
            }
            if (existingItem && (!byId.containsKey(item.imageId()) || !retainedIds.add(item.imageId()))) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_PLAN_INVALID);
            }
            if (newItem && (item.fileIndex() < 0
                    || item.fileIndex() >= normalizedFiles.size()
                    || !usedFileIndexes.add(item.fileIndex()))) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_PLAN_INVALID);
            }
        }
        if (usedFileIndexes.size() != normalizedFiles.size()) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_PLAN_INVALID);
        }

        List<ReviewImage> result = new ArrayList<>();
        for (int sortOrder = 0; sortOrder < plan.size(); sortOrder++) {
            ReviewImagePlanItem item = plan.get(sortOrder);
            ReviewImage image;
            if (item.imageId() != null) {
                image = byId.get(item.imageId());
                image.reorder(sortOrder);
            } else {
                image = store(normalizedFiles.get(item.fileIndex()), review, request, sortOrder);
            }
            result.add(image);
        }

        List<ReviewImage> removed = existing.stream()
                .filter(image -> !retainedIds.contains(image.getId()))
                .toList();
        imageRepository.deleteAll(removed);
        registerAfterCommitDelete(removed);
        imageRepository.flush();
        return result;
    }

    private ReviewImage store(MultipartFile file,
                              Review review,
                              SpiritVariantReviewRequest request,
                              int sortOrder) {
        DetectedImage detected = validateFile(file);
        // 입력 확장자와 무관하게 동일 UUID 경로를 WebP로 덮어써 원본/EXIF 사본을 남기지 않는다.
        String savedFileName = UUID.randomUUID() + ".webp";
        String subPath = "reviews/" + YearMonth.now().format(MONTH_DIR);
        ImageUploadResult upload;
        try {
            upload = fileStorageService.uploadImage(
                    file, savedFileName, subPath, detected.mimeType(),
                    WebpConversionMode.LOSSY, true);
        } catch (RuntimeException exception) {
            fileStorageService.delete(savedFileName, subPath);
            throw exception;
        }
        if (!"image/webp".equals(upload.mimeType())
                || !upload.savedFileName().toLowerCase(Locale.ROOT).endsWith(".webp")) {
            fileStorageService.delete(upload.savedFileName(), subPath);
            throw new CustomException(ErrorCode.STORAGE_ERROR);
        }
        registerRollbackDelete(upload.savedFileName(), subPath);
        return imageRepository.save(ReviewImage.builder()
                .review(review)
                .variantReviewRequest(request)
                .savedFileName(upload.savedFileName())
                .subPath(subPath)
                .mimeType(upload.mimeType())
                .imageUrl(upload.imageUrl())
                .sortOrder(sortOrder)
                .build());
    }

    private void validateFiles(List<MultipartFile> files) {
        if (files.size() > MAX_IMAGES) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_LIMIT_EXCEEDED);
        }
        long total = files.stream().mapToLong(MultipartFile::getSize).sum();
        if (total > MAX_TOTAL_SIZE) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_TOTAL_SIZE_EXCEEDED);
        }
        files.forEach(this::validateFile);
    }

    /**
     * 사진 한 장을 검증하고 내용에서 판별한 포맷을 돌려준다.
     * <p>
     * 판별은 오직 파일 내용(Magic Bytes)으로 한다 — 확장자도, 브라우저가 붙인 Content-Type 도 보지 않는다.
     * 카톡을 거치며 {@code .png} 로 이름만 바뀐 JPEG, 확장자가 없는 스크린샷, {@code .jfif} 가 모두 정상 등록된다.
     * 확장자 스푸핑 방어는 저장 파일명을 {@code UUID + ".webp"} 로 새로 만드는 것으로 끝난다
     * (원본 이름은 경로에 쓰이지 않는다 — {@link #store} 참고).
     * <p>
     * 크기 상한은 스트림을 열기 <b>전에</b> 본다. 10MB 를 넘긴 파일을 굳이 읽을 이유가 없다.
     */
    private DetectedImage validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_EMPTY);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_SIZE_EXCEEDED);
        }

        NoticeImageValidator.Detection detection = imageValidator.detect(file);
        if (!detection.supported()) {
            throw new CustomException(reviewErrorFor(detection.reason()));
        }
        AllowedImageFormat format = detection.format();
        if (!SUPPORTED_FORMATS.contains(format)) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_AVIF_UNSUPPORTED);
        }

        validatePixels(file);
        return new DetectedImage(format.getMimeType());
    }

    /**
     * 디코딩 폭탄 방어. 헤더가 멀쩡해도 본문이 깨져 있으면 여기서 걸린다 —
     * 그 경우는 "형식이 아니다"가 아니라 "손상됐다"로 알려야 사용자가 다음에 뭘 할지 안다.
     */
    private void validatePixels(MultipartFile file) {
        try {
            var image = ImmutableImage.loader().fromBytes(file.getBytes()).awt();
            if (image.getWidth() <= 0 || image.getHeight() <= 0) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_UNREADABLE);
            }
            if ((long) image.getWidth() * image.getHeight() > MAX_PIXELS) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_DIMENSIONS_EXCEEDED);
            }
        } catch (CustomException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_UNREADABLE);
        }
    }

    /** 공용 판별기의 도메인 중립 사유를 리뷰 도메인의 에러코드로 옮긴다. */
    private static ErrorCode reviewErrorFor(NoticeImageValidator.Unsupported reason) {
        return switch (reason) {
            case EMPTY -> ErrorCode.REVIEW_IMAGE_EMPTY;
            case UNREADABLE -> ErrorCode.REVIEW_IMAGE_UNREADABLE;
            case HEIC -> ErrorCode.REVIEW_IMAGE_HEIC_UNSUPPORTED;
            case SVG -> ErrorCode.REVIEW_IMAGE_SVG_UNSUPPORTED;
            case TIFF -> ErrorCode.REVIEW_IMAGE_TIFF_UNSUPPORTED;
            case UNKNOWN -> ErrorCode.REVIEW_IMAGE_INVALID_FORMAT;
        };
    }

    private void deleteImages(List<ReviewImage> images) {
        imageRepository.deleteAll(images);
        registerAfterCommitDelete(images);
    }

    private void registerRollbackDelete(String savedFileName, String subPath) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    fileStorageService.delete(savedFileName, subPath);
                }
            }
        });
    }

    private void registerAfterCommitDelete(List<ReviewImage> images) {
        if (images.isEmpty()) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            images.forEach(image -> fileStorageService.delete(image.getSavedFileName(), image.getSubPath()));
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                images.forEach(image ->
                        fileStorageService.delete(image.getSavedFileName(), image.getSubPath()));
            }
        });
    }

    private static List<MultipartFile> normalizeFiles(List<MultipartFile> files) {
        if (files == null) return List.of();
        return files.stream().filter(Objects::nonNull).toList();
    }

    private record DetectedImage(String mimeType) {}
}
