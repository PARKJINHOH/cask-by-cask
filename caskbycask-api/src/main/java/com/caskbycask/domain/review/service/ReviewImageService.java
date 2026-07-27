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

    private final ReviewImageRepository imageRepository;
    private final FileStorageService fileStorageService;

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

    private DetectedImage validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_SIZE_EXCEEDED);
        }

        String extension = extension(file.getOriginalFilename());
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception exception) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
        }
        String mimeType = detectMime(bytes);
        if (!mimeType.equals(file.getContentType())) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
        }
        boolean matches = switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg".equals(mimeType);
            case "png" -> "image/png".equals(mimeType);
            case "webp" -> "image/webp".equals(mimeType);
            default -> false;
        };
        if (!matches) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
        }
        try {
            var image = ImmutableImage.loader().fromBytes(bytes).awt();
            long pixels = (long) image.getWidth() * image.getHeight();
            if (image.getWidth() <= 0 || image.getHeight() <= 0) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
            }
            if (pixels > MAX_PIXELS) {
                throw new CustomException(ErrorCode.REVIEW_IMAGE_DIMENSIONS_EXCEEDED);
            }
        } catch (CustomException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
        }
        return new DetectedImage(mimeType, extension);
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

    private static String extension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private static String detectMime(byte[] bytes) {
        if (bytes.length >= 3
                && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        if (startsWith(bytes, png)) return "image/png";
        if (bytes.length >= 12
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }
        throw new CustomException(ErrorCode.REVIEW_IMAGE_INVALID_FORMAT);
    }

    private static boolean startsWith(byte[] source, byte[] prefix) {
        if (source.length < prefix.length) return false;
        for (int index = 0; index < prefix.length; index++) {
            if (source[index] != prefix[index]) return false;
        }
        return true;
    }

    private record DetectedImage(String mimeType, String extension) {}
}
