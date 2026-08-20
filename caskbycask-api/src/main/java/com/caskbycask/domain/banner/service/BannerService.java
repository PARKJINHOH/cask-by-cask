package com.caskbycask.domain.banner.service;

import com.caskbycask.domain.banner.dto.*;
import com.caskbycask.domain.banner.entity.Banner;
import com.caskbycask.domain.banner.entity.BannerImage;
import com.caskbycask.domain.banner.entity.enums.BannerImageType;
import com.caskbycask.domain.banner.entity.enums.BannerLanguage;
import com.caskbycask.domain.banner.entity.enums.BannerPosition;
import com.caskbycask.domain.banner.entity.enums.BannerType;
import com.caskbycask.domain.banner.repository.BannerImageRepository;
import com.caskbycask.domain.banner.repository.BannerRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import com.caskbycask.global.util.HtmlImageUrlExtractor;
import com.caskbycask.global.util.HtmlSanitizer;
import com.caskbycask.global.util.ImageUploadRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BannerService {

    private final BannerRepository bannerRepository;
    private final BannerImageRepository bannerImageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ValidatedImageUploader validatedImageUploader;
    private final HtmlSanitizer htmlSanitizer;
    private final ImageUploadRateLimiter imageUploadRateLimiter;

    // ═══════════════════════════════════════════
    // 공개 API
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<BannerResponse> getActiveBanners(BannerPosition position, BannerLanguage language) {
        Pageable limit10 = PageRequest.of(0, 10);
        List<Banner> banners = bannerRepository.findActiveBanners(position, language, LocalDateTime.now(), limit10);

        return banners.stream()
                .map(banner -> {
                    BannerImage pcImage = resolveImage(banner, BannerImageType.PC);
                    BannerImage moImage = resolveImage(banner, BannerImageType.MO);
                    return BannerResponse.from(banner, pcImage, moImage);
                })
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════
    // 관리자 CRUD
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<AdminBannerListResponse> getAllBannersForAdmin(BannerLanguage language, BannerPosition position, Boolean isVisible,
                                                               int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return bannerRepository.findAllForAdmin(language, position, isVisible, pageable)
                .map(AdminBannerListResponse::from);
    }

    @Transactional(readOnly = true)
    public AdminBannerDetailResponse getBannerForAdmin(Long bannerId) {
        Banner banner = findBannerById(bannerId);
        return AdminBannerDetailResponse.from(
                banner,
                resolveImage(banner, BannerImageType.PC),
                resolveImage(banner, BannerImageType.MO)
        );
    }

    @Transactional
    public AdminBannerDetailResponse createBanner(CreateBannerRequest request, Long creatorId) {
        User creator = userRepository.getByIdOrThrow(creatorId);

        LocalDateTime startAt = Boolean.TRUE.equals(request.getIsAlwaysVisible()) ? null : request.getStartAt();
        LocalDateTime endAt   = Boolean.TRUE.equals(request.getIsAlwaysVisible()) ? null : request.getEndAt();

        String contentSanitized = BannerType.HTML.equals(request.getBannerType())
                ? htmlSanitizer.sanitize(request.getContent(), true)
                : null;

        Banner banner = Banner.builder()
                .adminTitle(request.getAdminTitle())
                .bannerType(request.getBannerType())
                .position(request.getPosition())
                .language(request.getLanguage())
                .content(request.getContent())
                .contentSanitized(contentSanitized)
                .linkUrl(request.getLinkUrl())
                .linkTargetBlank(Boolean.TRUE.equals(request.getLinkTargetBlank()))
                .isVisible(Boolean.TRUE.equals(request.getIsVisible()))
                // 순서는 목록에서 드래그로만 바꾼다. 신규 배너는 항상 맨 아래.
                .sortOrder(nextSortOrder())
                .isAlwaysVisible(Boolean.TRUE.equals(request.getIsAlwaysVisible()))
                .startAt(startAt)
                .endAt(endAt)
                .createdBy(creator)
                .build();

        Banner saved = bannerRepository.save(banner);

        if (BannerType.IMAGE.equals(request.getBannerType())) {
            linkImage(saved, request.getBannerPcImageId(), BannerImageType.PC);
            if (request.getBannerMoImageId() != null) {
                linkImage(saved, request.getBannerMoImageId(), BannerImageType.MO);
            }
        }

        return AdminBannerDetailResponse.from(
                saved,
                resolveImage(saved, BannerImageType.PC),
                resolveImage(saved, BannerImageType.MO)
        );
    }

    @Transactional
    public AdminBannerDetailResponse updateBanner(Long bannerId, UpdateBannerRequest request) {
        Banner banner = findBannerById(bannerId);

        BannerPosition newPosition = request.getPosition() != null
                ? request.getPosition() : banner.getPosition();

        Boolean newIsAlwaysVisible = request.getIsAlwaysVisible() != null
                ? request.getIsAlwaysVisible() : banner.getIsAlwaysVisible();

        boolean scheduleFieldsProvided = request.getIsAlwaysVisible() != null;
        LocalDateTime newStartAt = Boolean.TRUE.equals(newIsAlwaysVisible) ? null
                : (scheduleFieldsProvided ? request.getStartAt()
                : (request.getStartAt() != null ? request.getStartAt() : banner.getStartAt()));
        LocalDateTime newEndAt = Boolean.TRUE.equals(newIsAlwaysVisible) ? null
                : (scheduleFieldsProvided ? request.getEndAt()
                : (request.getEndAt() != null ? request.getEndAt() : banner.getEndAt()));

        String newContent = request.getContent() != null ? request.getContent() : banner.getContent();
        String newContentSanitized = (request.getContent() != null && BannerType.HTML.equals(banner.getBannerType()))
                ? htmlSanitizer.sanitize(request.getContent(), true)
                : banner.getContentSanitized();

        banner.update(
                request.getAdminTitle()      != null ? request.getAdminTitle()      : banner.getAdminTitle(),
                newPosition,
                newContent, newContentSanitized,
                request.getLinkUrl()         != null ? request.getLinkUrl()         : banner.getLinkUrl(),
                request.getLinkTargetBlank() != null ? request.getLinkTargetBlank() : banner.getLinkTargetBlank(),
                request.getIsVisible()       != null ? request.getIsVisible()       : banner.getIsVisible(),
                banner.getSortOrder(),
                newIsAlwaysVisible, newStartAt, newEndAt
        );

        // PC 이미지 교체
        if (request.getBannerPcImageId() != null) {
            unlinkImage(banner, BannerImageType.PC);
            linkImage(banner, request.getBannerPcImageId(), BannerImageType.PC);
        }

        // MO 이미지 교체 또는 제거
        if (Boolean.TRUE.equals(request.getRemoveMoImage())) {
            unlinkImage(banner, BannerImageType.MO);
        } else if (request.getBannerMoImageId() != null) {
            unlinkImage(banner, BannerImageType.MO);
            linkImage(banner, request.getBannerMoImageId(), BannerImageType.MO);
        }

        // HTML형 콘텐츠 이미지 동기화
        if (BannerType.HTML.equals(banner.getBannerType()) && request.getContent() != null) {
            syncHtmlImageUsage(banner, request.getContent());
        }

        return AdminBannerDetailResponse.from(
                banner,
                resolveImage(banner, BannerImageType.PC),
                resolveImage(banner, BannerImageType.MO)
        );
    }

    @Transactional
    public void deleteBanner(Long bannerId) {
        Banner banner = findBannerById(bannerId);

        List<BannerImage> images = bannerImageRepository.findByBannerId(bannerId);
        images.forEach(img -> {
            fileStorageService.delete(img.getSavedFileName(), img.getSubPath());
            bannerImageRepository.delete(img);
        });

        bannerRepository.delete(banner);
    }

    @Transactional
    public void updateVisibility(Long bannerId, Boolean isVisible) {
        findBannerById(bannerId).setVisible(isVisible);
    }

    @Transactional
    public void updateSortOrder(Long bannerId, Integer sortOrder) {
        findBannerById(bannerId).setSortOrder(sortOrder);
    }

    /** 가장 큰 sortOrder 다음 값 — 신규 배너는 목록 맨 아래로 간다. */
    private int nextSortOrder() {
        return bannerRepository.findTopByOrderBySortOrderDesc()
                .map(banner -> banner.getSortOrder() + 1)
                .orElse(0);
    }

    // ═══════════════════════════════════════════
    // 이미지 업로드/삭제
    // ═══════════════════════════════════════════

    @Transactional
    public UploadedBannerImageResponse uploadImage(MultipartFile file, BannerImageType imageType, Long uploaderId) {
        // [보안] 관리자 계정 탈취/오작동 시 디스크 고갈 방지 — 분당 업로드 횟수 제한 (popup 과 공유)
        if (!imageUploadRateLimiter.isAllowed(uploaderId)) {
            throw new CustomException(ErrorCode.BANNER_IMAGE_RATE_LIMIT_EXCEEDED);
        }
        // [보안] 공통 검증(크기 → 내용 기반 포맷 판별 → UUID 파일명) + 연월별 디렉토리 저장
        // 배너는 작은 노출 영역에 텍스트가 포함되는 이미지가 많아 손실 압축 시 가독성이 크게 저하된다.
        StoredImage stored = validatedImageUploader.uploadLossless(file, "banners");

        User uploader = userRepository.getByIdOrThrow(uploaderId);

        BannerImage bannerImage = BannerImage.builder()
                .imageType(imageType)
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .subPath(stored.subPath())
                .fileSize(file.getSize())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .uploadedBy(uploader)
                .build();

        return UploadedBannerImageResponse.from(bannerImageRepository.save(bannerImage));
    }

    @Transactional
    public void deleteImage(Long imageId) {
        BannerImage image = bannerImageRepository.findById(imageId)
                .orElseThrow(() -> new CustomException(ErrorCode.BANNER_IMAGE_NOT_FOUND));

        if (Boolean.TRUE.equals(image.getIsUsed())) {
            throw new CustomException(ErrorCode.DELETE_USED_BANNER_IMAGE);
        }

        fileStorageService.delete(image.getSavedFileName(), image.getSubPath());
        bannerImageRepository.delete(image);
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private Banner findBannerById(Long bannerId) {
        return bannerRepository.findById(bannerId)
                .orElseThrow(() -> new CustomException(ErrorCode.BANNER_NOT_FOUND));
    }

    private BannerImage resolveImage(Banner banner, BannerImageType type) {
        if (!BannerType.IMAGE.equals(banner.getBannerType())) return null;
        return bannerImageRepository
                .findByBannerIdAndImageTypeAndIsUsedTrue(banner.getId(), type)
                .orElse(null);
    }

    private void linkImage(Banner banner, Long imageId, BannerImageType type) {
        BannerImage img = bannerImageRepository.findById(imageId)
                .orElseThrow(() -> new CustomException(ErrorCode.BANNER_IMAGE_NOT_FOUND));
        img.linkToBanner(banner);
    }

    private void unlinkImage(Banner banner, BannerImageType type) {
        bannerImageRepository
                .findByBannerIdAndImageTypeAndIsUsedTrue(banner.getId(), type)
                .ifPresent(BannerImage::markAsUnused);
    }

    private void syncHtmlImageUsage(Banner banner, String htmlContent) {
        Set<String> usedUrls = HtmlImageUrlExtractor.extract(htmlContent);

        bannerImageRepository.findByBannerId(banner.getId()).forEach(img -> {
            if (!usedUrls.contains(img.getImageUrl())) img.markAsUnused();
        });

        usedUrls.forEach(url ->
                bannerImageRepository.findByImageUrl(url).ifPresent(img -> {
                    if (!img.getIsUsed()) img.linkToBanner(banner);
                })
        );
    }
}
