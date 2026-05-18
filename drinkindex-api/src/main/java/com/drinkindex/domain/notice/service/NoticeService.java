package com.drinkindex.domain.notice.service;

import com.drinkindex.domain.notice.dto.*;
import com.drinkindex.domain.notice.dto.NoticeAdminDetailResponse;
import com.drinkindex.domain.notice.entity.Notice;
import com.drinkindex.domain.notice.entity.NoticeCategory;
import com.drinkindex.domain.notice.entity.NoticeImage;
import com.drinkindex.domain.notice.repository.NoticeImageRepository;
import com.drinkindex.domain.notice.repository.NoticeRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.FileStorageService;
import com.drinkindex.global.util.HtmlSanitizer;
import com.drinkindex.global.util.NoticeImageValidator;
import com.querydsl.core.BooleanBuilder;
import com.drinkindex.domain.notice.entity.QNotice;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeImageRepository noticeImageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NoticeImageValidator noticeImageValidator;
    private final HtmlSanitizer htmlSanitizer;

    // ═══════════════════════════════════════════
    // 공개 API
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<NoticeListResponse> getPublishedNotices(NoticeCategory category, int page, int size) {
        // isPinned DESC, createdAt DESC — 고정 공지 우선, 나머지 최신순
        Sort sort = Sort.by(Sort.Direction.DESC, "isPinned", "createdAt");
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Notice> notices = (category != null)
                ? noticeRepository.findAllByIsPublishedTrueAndCategory(category, pageable)
                : noticeRepository.findAllByIsPublishedTrue(pageable);

        return notices.map(NoticeListResponse::from);
    }

    @Transactional
    public NoticeDetailResponse getPublishedNoticeDetail(Long noticeId) {
        // [보안] isPublished=true 조건으로 미발행 공지 직접 접근 차단
        Notice notice = noticeRepository.findByIdAndIsPublishedTrue(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));

        // [동시성] DB 레벨 UPDATE — 애플리케이션 레벨 갱신보다 race condition에 안전
        noticeRepository.incrementViewCount(noticeId);

        List<NoticeImage> images = noticeImageRepository.findByNoticeIdAndIsUsedTrue(noticeId);
        // 현재 whitelist 기준으로 재Sanitize — 이전 버전 저장 데이터도 수정 없이 정상 렌더링
        String freshSanitized = htmlSanitizer.sanitizeLegal(notice.getContent());
        return NoticeDetailResponse.from(notice, images, freshSanitized);
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
        String freshSanitized = htmlSanitizer.sanitizeLegal(notice.getContent());
        return NoticeAdminDetailResponse.from(notice, images, freshSanitized);
    }

    @Transactional(readOnly = true)
    public Page<NoticeListResponse> getAllNoticesForAdmin(NoticeCategory category, Boolean isPublished,
                                                          int page, int size) {
        Sort sort = Sort.by(Sort.Direction.DESC, "isPinned", "createdAt");
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
        String contentSanitized = htmlSanitizer.sanitizeLegal(request.getContent());

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Notice notice = Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())         // 원본 HTML (DB 저장 전용)
                .contentSanitized(contentSanitized)    // Sanitize 완료본 (API 응답용)
                .category(request.getCategory() != null ? request.getCategory() : NoticeCategory.GENERAL)
                .isPinned(Boolean.TRUE.equals(request.getIsPinned()))
                .isPublished(Boolean.TRUE.equals(request.getIsPublished()))
                .author(author)
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
                ? htmlSanitizer.sanitizeLegal(request.getContent())
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
            if (request.getIsPublished()) notice.publish(); else notice.unpublish();
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

    // ═══════════════════════════════════════════
    // 관리자 이미지 업로드/삭제
    // ═══════════════════════════════════════════

    @Transactional
    public NoticeImageResponse uploadImage(MultipartFile file, Long uploaderId) {
        // [보안] 4단계 검증: 크기 → 확장자 → Magic Bytes → UUID 파일명 생성
        String mimeType = noticeImageValidator.validate(file);
        String savedFileName = noticeImageValidator.generateSavedFileName(file.getOriginalFilename());

        // 연월별 디렉토리 분리 (예: notices/202506)
        String subPath = "notices/" + YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));

        String imageUrl = fileStorageService.upload(file, savedFileName, subPath);

        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // notice=null, isUsed=false: 공지 저장 전 임시 상태
        NoticeImage noticeImage = NoticeImage.builder()
                .originalFileName(file.getOriginalFilename())
                .savedFileName(savedFileName)
                .subPath(subPath)
                .fileSize(file.getSize())
                .mimeType(mimeType)
                .imageUrl(imageUrl)
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
        Set<String> usedImageUrls = Jsoup.parse(htmlContent).select("img[src]").stream()
                .map(el -> el.attr("src"))
                .filter(src -> !src.isBlank())
                .collect(Collectors.toSet());

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
