package com.caskbycask.domain.venue.service;

import com.caskbycask.domain.venue.entity.VenueComment;
import com.caskbycask.domain.venue.entity.VenueCommentImage;
import com.caskbycask.domain.venue.repository.VenueCommentImageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.ImageDimensionReader;
import com.caskbycask.global.storage.ImagePlanValidator;
import com.caskbycask.global.storage.ValidatedImageUploader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 장소 댓글 사진 — 최대 5장.
 *
 * <p>검증·저장의 보안 핵심(매직바이트 판별, WebP 강제 재인코딩, UUID 파일명)은
 * {@link ValidatedImageUploader} 에 이미 있으므로 그대로 쓴다. 여기서 더하는 것은
 * 이 도메인의 상한(장수·용량)과 디코딩 폭탄 가드뿐이다.
 *
 * <p>교체는 {@link ImagePlanValidator} 의 계획 규약을 따른다 — "2번 유지하되 맨 앞으로,
 * 1번 삭제, 새로 한 장"을 요청 한 번에 원자적으로 처리한다.
 */
@Service
@RequiredArgsConstructor
public class VenueCommentImageService {

    public static final int MAX_IMAGES = 5;
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final long MAX_TOTAL_SIZE = 50L * 1024 * 1024;
    /** 4천만 픽셀. 헤더는 멀쩡한데 본문이 거대한 "디코딩 폭탄"을 막는다. */
    private static final long MAX_PIXELS = 40_000_000L;
    private static final String UPLOAD_DIRECTORY = "venues";

    private final VenueCommentImageRepository imageRepository;
    private final ValidatedImageUploader imageUploader;
    private final ImageDimensionReader dimensionReader;
    private final ImagePlanValidator planValidator;

    @Transactional(readOnly = true)
    public List<VenueCommentImage> findByCommentId(Long commentId) {
        return imageRepository.findAllByCommentIdOrderBySortOrderAscIdAsc(commentId);
    }

    @Transactional(readOnly = true)
    public Map<Long, List<VenueCommentImage>> findByCommentIds(List<Long> commentIds) {
        if (commentIds.isEmpty()) return Map.of();
        return imageRepository.findAllByCommentIds(commentIds).stream()
                .collect(Collectors.groupingBy(image -> image.getComment().getId()));
    }

    @Transactional(readOnly = true)
    public List<VenueCommentImage> findGallery(Long venueId) {
        return imageRepository.findGalleryByVenueId(venueId);
    }

    /** 신규 작성 — 계획 없이 올린 순서대로 붙인다. */
    @Transactional
    public List<VenueCommentImage> attach(VenueComment comment, List<MultipartFile> files) {
        List<MultipartFile> normalized = ImagePlanValidator.normalizeFiles(files);
        if (normalized.isEmpty()) return List.of();
        validateFiles(normalized);

        List<VenueCommentImage> saved = new ArrayList<>();
        for (int order = 0; order < normalized.size(); order++) {
            saved.add(store(normalized.get(order), comment, order));
        }
        return saved;
    }

    /**
     * 수정 — 계획대로 유지·재정렬·교체를 한 번에 적용한다.
     *
     * <p>계획에 없는 기존 이미지는 지운다. 파일 삭제는 커밋 이후에 한다 —
     * 커밋 전에 지우면 롤백됐을 때 DB 에는 행이 남고 파일만 사라져 깨진 이미지가 영구히 남는다.
     */
    @Transactional
    public List<VenueCommentImage> replace(VenueComment comment,
                                           List<ImagePlanValidator.PlanItem> plan,
                                           List<MultipartFile> files) {
        List<VenueCommentImage> existing = findByCommentId(comment.getId());
        Map<Long, VenueCommentImage> byId = new HashMap<>();
        existing.forEach(image -> byId.put(image.getId(), image));

        List<MultipartFile> normalized = ImagePlanValidator.normalizeFiles(files);
        validateFiles(normalized);

        List<ImagePlanValidator.ResolvedSlot> slots = planValidator.resolve(
                plan, normalized, byId.keySet(), MAX_IMAGES,
                ErrorCode.VENUE_COMMENT_IMAGE_LIMIT_EXCEEDED,
                ErrorCode.VENUE_COMMENT_IMAGE_PLAN_INVALID);

        List<VenueCommentImage> result = new ArrayList<>();
        for (ImagePlanValidator.ResolvedSlot slot : slots) {
            if (slot.retainedImageId() != null) {
                VenueCommentImage kept = byId.get(slot.retainedImageId());
                kept.reorder(slot.sortOrder());
                result.add(kept);
            } else {
                result.add(store(slot.newFile(), comment, slot.sortOrder()));
            }
        }

        Set<Long> retained = planValidator.retainedIds(slots);
        List<VenueCommentImage> removed = existing.stream()
                .filter(image -> !retained.contains(image.getId()))
                .toList();
        deleteAll(removed);
        imageRepository.flush();
        return result;
    }

    /** 댓글·장소가 사라질 때의 정리. FK 가 없으므로 호출부가 반드시 불러야 한다. */
    @Transactional
    public void deleteByCommentIds(List<Long> commentIds) {
        if (commentIds.isEmpty()) return;
        deleteAll(imageRepository.findAllByCommentIds(commentIds));
    }

    private void deleteAll(List<VenueCommentImage> images) {
        if (images.isEmpty()) return;
        imageRepository.deleteAll(images);
        planValidator.deleteAfterCommit(images.stream()
                .map(i -> new ImagePlanValidator.StoredFileRef(i.getSavedFileName(), i.getSubPath()))
                .toList());
    }

    /**
     * 장수·용량 상한.
     *
     * <p>스트림을 열기 <b>전에</b> 본다 — 상한을 넘긴 파일을 굳이 읽을 이유가 없다.
     * 개별 초과와 합계 초과를 다른 메시지로 나눈 것은, 사용자가 어느 쪽을 줄여야 할지
     * 알아야 다음 시도가 성공하기 때문이다.
     */
    private void validateFiles(List<MultipartFile> files) {
        if (files.size() > MAX_IMAGES) {
            throw new CustomException(ErrorCode.VENUE_COMMENT_IMAGE_LIMIT_EXCEEDED);
        }
        long total = 0;
        for (MultipartFile file : files) {
            if (file.getSize() > MAX_FILE_SIZE) {
                throw new CustomException(ErrorCode.VENUE_COMMENT_IMAGE_SIZE_EXCEEDED);
            }
            total += file.getSize();
        }
        if (total > MAX_TOTAL_SIZE) {
            throw new CustomException(ErrorCode.VENUE_COMMENT_IMAGE_TOTAL_SIZE_EXCEEDED);
        }
    }

    private VenueCommentImage store(MultipartFile file, VenueComment comment, int sortOrder) {
        validatePixels(file);

        // 여기서 포맷 판별(매직바이트) · WebP 재인코딩 · UUID 파일명이 모두 처리된다.
        // 재인코딩이 EXIF 를 지우는 것이 중요하다 — 바 사진에는 촬영 위치가 박혀 있다.
        ValidatedImageUploader.StoredImage stored = imageUploader.upload(file, UPLOAD_DIRECTORY);
        planValidator.deleteOnRollback(stored.savedFileName(), stored.subPath());

        return imageRepository.save(VenueCommentImage.builder()
                .comment(comment)
                .savedFileName(stored.savedFileName())
                .subPath(stored.subPath())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .sortOrder(sortOrder)
                .build());
    }

    private void validatePixels(MultipartFile file) {
        dimensionReader.read(file).ifPresent(dimension -> {
            if ((long) dimension.width() * dimension.height() > MAX_PIXELS) {
                throw new CustomException(ErrorCode.VENUE_COMMENT_IMAGE_SIZE_EXCEEDED);
            }
        });
    }
}
