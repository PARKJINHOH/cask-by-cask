package com.drinkindex.domain.popup.service;

import com.drinkindex.domain.popup.dto.*;
import com.drinkindex.domain.popup.entity.Popup;
import com.drinkindex.domain.popup.entity.PopupImage;
import com.drinkindex.domain.popup.entity.enums.PopupDisplayPage;
import com.drinkindex.domain.popup.entity.enums.PopupImageType;
import com.drinkindex.domain.popup.entity.enums.PopupLanguage;
import com.drinkindex.domain.popup.entity.enums.PopupType;
import com.drinkindex.domain.popup.repository.PopupImageRepository;
import com.drinkindex.domain.popup.repository.PopupRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.FileStorageService;
import com.drinkindex.global.util.HtmlSanitizer;
import com.drinkindex.global.util.NoticeImageValidator;
import com.drinkindex.global.util.PopupImageRateLimiter;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PopupService {

    private final PopupRepository popupRepository;
    private final PopupImageRepository popupImageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NoticeImageValidator noticeImageValidator;
    private final HtmlSanitizer htmlSanitizer;
    private final PopupImageRateLimiter popupImageRateLimiter;

    // ═══════════════════════════════════════════
    // 공개 API
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<PopupResponse> getActivePopups(PopupLanguage language, PopupDisplayPage displayPage) {
        Pageable limit5 = PageRequest.of(0, 5);
        List<Popup> popups = popupRepository.findActivePopups(displayPage, language, LocalDateTime.now(), limit5);

        return popups.stream()
                .map(popup -> {
                    PopupImage mainImage = resolveMainImage(popup);
                    return PopupResponse.from(popup, mainImage);
                })
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════
    // 관리자 팝업 CRUD
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<AdminPopupListResponse> getAllPopupsForAdmin(PopupLanguage language, Boolean isVisible,
                                                             int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return popupRepository.findAllForAdmin(language, isVisible, pageable)
                .map(AdminPopupListResponse::from);
    }

    @Transactional(readOnly = true)
    public AdminPopupDetailResponse getPopupForAdmin(Long popupId) {
        Popup popup = findPopupById(popupId);
        PopupImage mainImage = resolveMainImage(popup);
        return AdminPopupDetailResponse.from(popup, mainImage);
    }

    @Transactional
    public AdminPopupDetailResponse createPopup(CreatePopupRequest request, Long creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // isAlwaysVisible=true → startAt/endAt 강제 null
        LocalDateTime startAt = Boolean.TRUE.equals(request.getIsAlwaysVisible()) ? null : request.getStartAt();
        LocalDateTime endAt   = Boolean.TRUE.equals(request.getIsAlwaysVisible()) ? null : request.getEndAt();

        // [보안] XSS: HTML형 저장 전 서버 Sanitize 필수. 프론트 DOMPurify 우회 방어.
        String contentSanitized = PopupType.HTML.equals(request.getPopupType())
                ? htmlSanitizer.sanitize(request.getContent())
                : null;

        Popup popup = Popup.builder()
                .adminTitle(request.getAdminTitle())
                .popupType(request.getPopupType())
                .language(request.getLanguage())
                .displayPage(request.getDisplayPage() != null ? request.getDisplayPage() : PopupDisplayPage.MAIN)
                .content(request.getContent())
                .contentSanitized(contentSanitized)
                .linkUrl(request.getLinkUrl())
                .linkTargetBlank(Boolean.TRUE.equals(request.getLinkTargetBlank()))
                .isVisible(Boolean.TRUE.equals(request.getIsVisible()))
                .sortOrder(request.getSortOrder())
                .closeOnOverlay(Boolean.TRUE.equals(request.getCloseOnOverlay()))
                .isAlwaysVisible(Boolean.TRUE.equals(request.getIsAlwaysVisible()))
                .startAt(startAt)
                .endAt(endAt)
                .createdBy(creator)
                .build();

        Popup saved = popupRepository.save(popup);
        syncImageUsage(saved, request.getPopupType(), request.getContent(), request.getPopupImageId());

        PopupImage mainImage = resolveMainImage(saved);
        return AdminPopupDetailResponse.from(saved, mainImage);
    }

    @Transactional
    public AdminPopupDetailResponse updatePopup(Long popupId, UpdatePopupRequest request) {
        Popup popup = findPopupById(popupId);

        // isAlwaysVisible 변경 감지 → true이면 startAt/endAt null 처리
        Boolean newIsAlwaysVisible = request.getIsAlwaysVisible() != null
                ? request.getIsAlwaysVisible()
                : popup.getIsAlwaysVisible();

        LocalDateTime newStartAt = Boolean.TRUE.equals(newIsAlwaysVisible) ? null
                : (request.getStartAt() != null ? request.getStartAt() : popup.getStartAt());
        LocalDateTime newEndAt = Boolean.TRUE.equals(newIsAlwaysVisible) ? null
                : (request.getEndAt() != null ? request.getEndAt() : popup.getEndAt());

        // content 변경 시 재Sanitize
        PopupType effectiveType = request.getPopupType() != null ? request.getPopupType() : popup.getPopupType();
        String newContent = request.getContent() != null ? request.getContent() : popup.getContent();
        String newContentSanitized = (request.getContent() != null && PopupType.HTML.equals(effectiveType))
                ? htmlSanitizer.sanitize(request.getContent())
                : popup.getContentSanitized();

        popup.update(
                request.getAdminTitle()    != null ? request.getAdminTitle()    : popup.getAdminTitle(),
                newContent,
                newContentSanitized,
                request.getLinkUrl()       != null ? request.getLinkUrl()       : popup.getLinkUrl(),
                request.getLinkTargetBlank() != null ? request.getLinkTargetBlank() : popup.getLinkTargetBlank(),
                request.getIsVisible()     != null ? request.getIsVisible()     : popup.getIsVisible(),
                request.getSortOrder()     != null ? request.getSortOrder()     : popup.getSortOrder(),
                request.getCloseOnOverlay() != null ? request.getCloseOnOverlay() : popup.getCloseOnOverlay(),
                newIsAlwaysVisible,
                newStartAt,
                newEndAt
        );

        // 이미지 사용 현황 재동기화
        Long imageIdForSync = request.getPopupImageId();
        String contentForSync = request.getContent() != null ? request.getContent() : null;
        if (contentForSync != null || imageIdForSync != null) {
            syncImageUsage(popup, effectiveType, contentForSync, imageIdForSync);
        }

        PopupImage mainImage = resolveMainImage(popup);
        return AdminPopupDetailResponse.from(popup, mainImage);
    }

    @Transactional
    public void deletePopup(Long popupId) {
        Popup popup = findPopupById(popupId);

        // 연결된 PopupImage 파일 삭제 후 레코드 삭제
        List<PopupImage> images = popupImageRepository.findByPopupId(popupId);
        images.forEach(img -> {
            fileStorageService.delete(img.getSavedFileName(), img.getSubPath());
            popupImageRepository.delete(img);
        });

        popupRepository.delete(popup);
    }

    @Transactional
    public void updateVisibility(Long popupId, Boolean isVisible) {
        Popup popup = findPopupById(popupId);
        popup.setVisible(isVisible);
    }

    @Transactional
    public void updateSortOrder(Long popupId, Integer sortOrder) {
        Popup popup = findPopupById(popupId);
        popup.setSortOrder(sortOrder);
    }

    // ═══════════════════════════════════════════
    // 관리자 이미지 업로드/삭제
    // ═══════════════════════════════════════════

    @Transactional
    public UploadedPopupImageResponse uploadImage(MultipartFile file, PopupImageType imageType, Long uploaderId) {
        if (!popupImageRateLimiter.isAllowed(uploaderId)) {
            throw new CustomException(ErrorCode.POPUP_IMAGE_RATE_LIMIT_EXCEEDED);
        }

        // [보안] 4단계 검증 재사용: 크기 → 확장자 → Magic Bytes → UUID 파일명
        String mimeType = noticeImageValidator.validate(file);
        String savedFileName = noticeImageValidator.generateSavedFileName(file.getOriginalFilename());

        String subPath = "popups/" + YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String imageUrl = fileStorageService.upload(file, savedFileName, subPath);

        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        PopupImage popupImage = PopupImage.builder()
                .imageType(imageType)
                .originalFileName(file.getOriginalFilename())
                .savedFileName(savedFileName)
                .subPath(subPath)
                .fileSize(file.getSize())
                .mimeType(mimeType)
                .imageUrl(imageUrl)
                .uploadedBy(uploader)
                .build();

        return UploadedPopupImageResponse.from(popupImageRepository.save(popupImage));
    }

    @Transactional
    public void deleteImage(Long imageId) {
        PopupImage image = popupImageRepository.findById(imageId)
                .orElseThrow(() -> new CustomException(ErrorCode.POPUP_IMAGE_NOT_FOUND));

        if (Boolean.TRUE.equals(image.getIsUsed())) {
            throw new CustomException(ErrorCode.DELETE_USED_POPUP_IMAGE);
        }

        fileStorageService.delete(image.getSavedFileName(), image.getSubPath());
        popupImageRepository.delete(image);
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private Popup findPopupById(Long popupId) {
        return popupRepository.findById(popupId)
                .orElseThrow(() -> new CustomException(ErrorCode.POPUP_NOT_FOUND));
    }

    private PopupImage resolveMainImage(Popup popup) {
        if (!PopupType.IMAGE.equals(popup.getPopupType())) return null;
        return popupImageRepository.findByPopupIdAndIsUsedTrue(popup.getId())
                .stream()
                .filter(img -> PopupImageType.MAIN.equals(img.getImageType()))
                .findFirst()
                .orElse(null);
    }

    /**
     * 팝업 저장/수정 시 이미지 사용 현황 동기화.
     * - HTML형: img[src] URL 파싱 후 해당 PopupImage 연결 (isUsed=true)
     * - IMAGE형: popupImageId로 MAIN 이미지 연결
     */
    private void syncImageUsage(Popup popup, PopupType popupType, String htmlContent, Long popupImageId) {
        if (PopupType.HTML.equals(popupType) && htmlContent != null) {
            Set<String> usedUrls = Jsoup.parse(htmlContent).select("img[src]").stream()
                    .map(el -> el.attr("src"))
                    .filter(src -> !src.isBlank())
                    .collect(Collectors.toSet());

            popupImageRepository.findByPopupId(popup.getId()).forEach(img -> {
                if (!usedUrls.contains(img.getImageUrl())) {
                    img.markAsUnused();
                }
            });

            usedUrls.forEach(url ->
                    popupImageRepository.findByImageUrl(url).ifPresent(img -> {
                        if (!img.getIsUsed()) img.linkToPopup(popup);
                    })
            );

        } else if (PopupType.IMAGE.equals(popupType) && popupImageId != null) {
            // 기존 MAIN 이미지 연결 해제
            popupImageRepository.findByPopupId(popup.getId()).forEach(img -> {
                if (PopupImageType.MAIN.equals(img.getImageType())) img.markAsUnused();
            });

            PopupImage mainImage = popupImageRepository.findById(popupImageId)
                    .orElseThrow(() -> new CustomException(ErrorCode.POPUP_IMAGE_NOT_FOUND));
            mainImage.linkToPopup(popup);
        }
    }
}
