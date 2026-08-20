package com.caskbycask.domain.notice.service;

import com.caskbycask.domain.notice.dto.*;
import com.caskbycask.domain.notice.dto.NoticeAdminDetailResponse;
import com.caskbycask.domain.notice.entity.Notice;
import com.caskbycask.domain.notice.entity.NoticeCategory;
import com.caskbycask.domain.notice.entity.NoticeImage;
import com.caskbycask.domain.notice.entity.NoticeRecommend;
import com.caskbycask.domain.notice.repository.NoticeImageRepository;
import com.caskbycask.domain.notice.repository.NoticeRecommendRepository;
import com.caskbycask.domain.notice.repository.NoticeRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import com.caskbycask.global.util.HtmlImageUrlExtractor;
import com.caskbycask.global.util.HtmlSanitizer;
import com.querydsl.core.BooleanBuilder;
import com.caskbycask.domain.notice.entity.QNotice;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeImageRepository noticeImageRepository;
    private final NoticeRecommendRepository noticeRecommendRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ValidatedImageUploader validatedImageUploader;
    private final HtmlSanitizer htmlSanitizer;
    private final NoticeViewCountService noticeViewCountService;

    // ═══════════════════════════════════════════
    // 공개 API
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<NoticeListResponse> getPublishedNotices(NoticeCategory category, int page, int size, Long userId) {
        // isPinned DESC, displayOrder ASC, createdAt DESC
        //   — 고정 공지 우선, 그다음 관리자가 정한 순서(작을수록 위), 나머지 최신순.
        //   displayOrder 가 작을수록 위인 규칙은 배너·팝업·FAQ·말머리와 같다.
        Sort sort = Sort.by(Sort.Direction.DESC, "isPinned")
                .and(Sort.by(Sort.Direction.ASC, "displayOrder"))
                .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable pageable = PageRequest.of(page, size, sort);

        LocalDateTime now = LocalDateTime.now();
        Page<Notice> notices = (category != null)
                ? noticeRepository.findAllPublishedByCategory(category, now, pageable)
                : noticeRepository.findAllPublished(now, pageable);

        // 현재 사용자가 추천한 공지 id 집합 (비회원은 빈 집합)
        final Set<Long> recommendedIds;
        if (userId != null && notices.hasContent()) {
            List<Long> ids = notices.getContent().stream().map(Notice::getId).collect(Collectors.toList());
            recommendedIds = Set.copyOf(noticeRecommendRepository.findRecommendedNoticeIds(userId, ids));
        } else {
            recommendedIds = Set.of();
        }

        return notices.map(n -> NoticeListResponse.from(n, recommendedIds.contains(n.getId())));
    }

    @Transactional
    public NoticeDetailResponse getPublishedNoticeDetail(Long noticeId, Long userId, String clientIp) {
        // [보안] isPublished=true 조건으로 미발행 공지 직접 접근 차단
        Notice notice = noticeRepository.findPublishedById(noticeId, LocalDateTime.now())
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));

        // [패치 7] 게시글과 동일한 Redis TTL(1시간) 중복 방지 — 키 없을 때만 viewCount UPDATE
        noticeViewCountService.tryIncrementViewCount(noticeId, userId, clientIp);

        boolean isRecommended = userId != null
                && noticeRecommendRepository.existsByNoticeIdAndUserId(noticeId, userId);

        List<NoticeImage> images = noticeImageRepository.findByNoticeIdAndIsUsedTrue(noticeId);
        // 현재 whitelist 기준으로 재Sanitize — 이전 버전 저장 데이터도 수정 없이 정상 렌더링
        String freshSanitized = htmlSanitizer.sanitize(notice.getContent(), true);
        return NoticeDetailResponse.from(notice, images, freshSanitized, isRecommended);
    }

    /**
     * 공지 추천 토글 (추천 ↔ 추천 취소).
     * 발행된 공지만 추천 가능.
     */
    @Transactional
    public NoticeRecommendResponse toggleRecommend(Long noticeId, Long userId) {
        Notice notice = noticeRepository.findPublishedById(noticeId, LocalDateTime.now())
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));

        return noticeRecommendRepository.findByNoticeIdAndUserId(noticeId, userId)
                .map(existing -> {
                    // 이미 추천 → 취소
                    noticeRecommendRepository.delete(existing);
                    notice.decreaseRecommendCount();
                    return NoticeRecommendResponse.of(false, notice.getRecommendCount());
                })
                .orElseGet(() -> {
                    // 미추천 → 추천
                    User user = userRepository.getByIdOrThrow(userId);
                    noticeRecommendRepository.save(
                            NoticeRecommend.builder().notice(notice).user(user).build());
                    notice.increaseRecommendCount();
                    return NoticeRecommendResponse.of(true, notice.getRecommendCount());
                });
    }

    // ═══════════════════════════════════════════
    // 관리자 공지 CRUD
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public NoticeAdminDetailResponse getNoticeForAdmin(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        List<NoticeImage> images = noticeImageRepository.findByNoticeIdAndIsUsedTrue(noticeId);
        // 현재 whitelist 기준으로 재Sanitize — 이전 버전 저장 데이터도 수정 없이 정상 렌더링
        String freshSanitized = htmlSanitizer.sanitize(notice.getContent(), true);
        return NoticeAdminDetailResponse.from(notice, images, freshSanitized);
    }

    @Transactional(readOnly = true)
    public Page<NoticeListResponse> getAllNoticesForAdmin(NoticeCategory category, Boolean isPublished,
                                                          int page, int size) {
        Sort sort = Sort.by(Sort.Direction.DESC, "isPinned")
                .and(Sort.by(Sort.Direction.ASC, "displayOrder"))
                .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable pageable = PageRequest.of(page, size, sort);

        // Querydsl BooleanBuilder로 nullable 필터 처리
        BooleanBuilder predicate = new BooleanBuilder();
        if (category != null) {
            predicate.and(QNotice.notice.category.eq(category));
        }
        if (isPublished != null) {
            predicate.and(QNotice.notice.isPublished.eq(isPublished));
        }

        return noticeRepository.findAll(predicate, pageable)
                .map(NoticeListResponse::from);
    }

    @Transactional
    public NoticeDetailResponse createNotice(CreateNoticeRequest request, Long authorId) {
        // [보안] XSS: 저장 전 서버 Sanitize 필수.
        //   프론트 DOMPurify만으로는 불충분 — API 직접 호출 시 우회 가능.
        String contentSanitized = htmlSanitizer.sanitize(request.getContent(), true);

        User author = userRepository.getByIdOrThrow(authorId);

        Notice notice = Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())         // 원본 HTML (DB 저장 전용)
                .contentSanitized(contentSanitized)    // Sanitize 완료본 (API 응답용)
                .category(request.getCategory() != null ? request.getCategory() : NoticeCategory.GENERAL)
                .isPinned(Boolean.TRUE.equals(request.getIsPinned()))
                .isPublished(Boolean.TRUE.equals(request.getIsPublished()))
                .publishedAt(Boolean.TRUE.equals(request.getIsPublished())
                        ? (request.getPublishedAt() != null ? request.getPublishedAt() : LocalDateTime.now())
                        : null)
                .author(author)
                // 공지 목록은 최신순이 기본이라 신규 공지만 맨 위로 올린다.
                // (다른 관리 화면은 신규가 맨 아래지만, 여기서 아래로 보내면 새 공지가 목록 최하단에 깔린다.)
                .displayOrder(topDisplayOrder())
                .build();

        Notice saved = noticeRepository.save(notice);

        // 본문 src에 포함된 이미지들을 이 공지에 연결
        syncImageUsage(saved, request.getContent());

        List<NoticeImage> images = noticeImageRepository.findByNoticeIdAndIsUsedTrue(saved.getId());
        return NoticeDetailResponse.from(saved, images, contentSanitized);
    }

    @Transactional
    public NoticeDetailResponse updateNotice(Long noticeId, UpdateNoticeRequest request) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));

        // content 변경 시 재Sanitize
        String newContent = request.getContent() != null ? request.getContent() : notice.getContent();
        String newContentSanitized = request.getContent() != null
                ? htmlSanitizer.sanitize(request.getContent(), true)
                : notice.getContentSanitized();

        notice.update(
                request.getTitle() != null ? request.getTitle() : notice.getTitle(),
                newContent,
                newContentSanitized,
                request.getCategory() != null ? request.getCategory() : notice.getCategory()
        );

        if (request.getIsPinned() != null) {
            if (request.getIsPinned()) notice.pin(); else notice.unpin();
        }
        if (request.getIsPublished() != null) {
            if (request.getIsPublished()) {
                LocalDateTime now = LocalDateTime.now();
                LocalDateTime targetPublishedAt = request.getPublishedAt();
                if (targetPublishedAt == null) {
                    boolean alreadyPublished = Boolean.TRUE.equals(notice.getIsPublished())
                            && (notice.getPublishedAt() == null || !notice.getPublishedAt().isAfter(now));
                    targetPublishedAt = alreadyPublished ? notice.getPublishedAt() : now;
                }
                notice.publish(targetPublishedAt);
            } else {
                notice.unpublish();
            }
        }

        // content 변경된 경우 이미지 사용 현황 재동기화
        if (request.getContent() != null) {
            syncImageUsage(notice, request.getContent());
        }

        List<NoticeImage> images = noticeImageRepository.findByNoticeIdAndIsUsedTrue(noticeId);
        return NoticeDetailResponse.from(notice, images, newContentSanitized);
    }

    @Transactional
    public void deleteNotice(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        notice.softDelete();
    }

    /** 가장 작은 displayOrder 앞의 값 — 신규 공지는 목록 맨 위로 간다. */
    private int topDisplayOrder() {
        return noticeRepository.findTopByOrderByDisplayOrderAsc()
                .map(notice -> notice.getDisplayOrder() - 1)
                .orElse(0);
    }

    /** 목록에 보이는 순서대로 id 를 받아 그대로 displayOrder 로 굳힌다(배열 index = displayOrder). */
    @Transactional
    public void updateDisplayOrders(List<Long> noticeIds) {
        for (int i = 0; i < noticeIds.size(); i++) {
            Long noticeId = noticeIds.get(i);
            Notice notice = noticeRepository.findById(noticeId)
                    .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
            notice.updateDisplayOrder(i);
        }
    }

    // ═══════════════════════════════════════════
    // 관리자 이미지 업로드/삭제
    // ═══════════════════════════════════════════

    @Transactional
    public NoticeImageResponse uploadImage(MultipartFile file, Long uploaderId) {
        // [보안] 공통 검증(크기 → 내용 기반 포맷 판별 → UUID 파일명) + 연월별 디렉토리 저장
        StoredImage stored = validatedImageUploader.upload(file, "notices");

        User uploader = userRepository.getByIdOrThrow(uploaderId);

        // notice=null, isUsed=false: 공지 저장 전 임시 상태
        NoticeImage noticeImage = NoticeImage.builder()
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .subPath(stored.subPath())
                .fileSize(file.getSize())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .uploadedBy(uploader)
                .build();

        return NoticeImageResponse.from(noticeImageRepository.save(noticeImage));
    }

    @Transactional
    public void deleteImage(Long imageId) {
        NoticeImage noticeImage = noticeImageRepository.findById(imageId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_IMAGE_NOT_FOUND));

        // [보안] 공지 본문에 사용 중인 이미지 삭제 방지: 본문에서 제거 후 삭제 유도
        if (Boolean.TRUE.equals(noticeImage.getIsUsed())) {
            throw new CustomException(ErrorCode.DELETE_USED_IMAGE);
        }

        fileStorageService.delete(noticeImage.getSavedFileName(), noticeImage.getSubPath());
        noticeImageRepository.delete(noticeImage);
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    /**
     * 본문 HTML의 img[src] URL을 파싱하여 NoticeImage 연결 상태를 동기화.
     * - 새 본문에 있는 이미지 → isUsed=true, notice 연결
     * - 이전에 연결됐으나 새 본문에서 제거된 이미지 → isUsed=false
     */
    private void syncImageUsage(Notice notice, String htmlContent) {
        Set<String> usedImageUrls = HtmlImageUrlExtractor.extract(htmlContent);

        // 기존 연결 이미지 중 새 본문에 없는 것 → 연결 해제
        noticeImageRepository.findByNoticeId(notice.getId()).forEach(img -> {
            if (!usedImageUrls.contains(img.getImageUrl())) {
                img.markAsUnused();
            }
        });

        // 새 본문에 있는 이미지 URL → 해당 NoticeImage 연결 (아직 미연결인 경우만)
        usedImageUrls.forEach(url ->
                noticeImageRepository.findByImageUrl(url).ifPresent(img -> {
                    if (!img.getIsUsed()) {
                        img.linkToNotice(notice);
                    }
                })
        );
    }
}
