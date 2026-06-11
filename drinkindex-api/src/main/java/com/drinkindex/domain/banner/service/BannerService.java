package com.drinkindex.domain.banner.service;

import com.drinkindex.domain.banner.dto.*;
import com.drinkindex.domain.banner.entity.Banner;
import com.drinkindex.domain.banner.entity.BannerImage;
import com.drinkindex.domain.banner.entity.enums.BannerImageType;
import com.drinkindex.domain.banner.entity.enums.BannerLanguage;
import com.drinkindex.domain.banner.entity.enums.BannerType;
import com.drinkindex.domain.banner.repository.BannerImageRepository;
import com.drinkindex.domain.banner.repository.BannerRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.FileStorageService;
import com.drinkindex.global.storage.ValidatedImageUploader;
import com.drinkindex.global.storage.ValidatedImageUploader.StoredImage;
import com.drinkindex.global.util.HtmlImageUrlExtractor;
import com.drinkindex.global.util.HtmlSanitizer;
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

    // ═══════════════════════════════════════════
    // 공개 API
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<BannerResponse> getActiveBanners(BannerLanguage language) {
        Pageable limit10 = PageRequest.of(0, 10);
        List<Banner> banners = bannerRepository.findActiveBanners(language, LocalDateTime.now(), limit10);

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
    public Page<AdminBannerListResponse> getAllBannersForAdmin(BannerLanguage language, Boolean isVisible,
                                                               int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return bannerRepository.findAllForAdmin(language, isVisible, pageable)
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
                ? htmlSanitizer.sanitizeLegal(request.getContent())
                : null;

        Banner banner = Banner.builder()
                .adminTitle(request.getAdminTitle())
                .bannerType(request.getBannerType())
                .language(request.getLanguage())
                .content(request.getContent())
                .contentSanitized(contentSanitized)
                .linkUrl(request.getLinkUrl())
                .linkTargetBlank(Boolean.TRUE.equals(request.getLinkTargetBlank()))
                .isVisible(Boolean.TRUE.equals(request.getIsVisible()))
                .sortOrder(0)
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

        Boolean newIsAlwaysVisible = request.getIsAlwaysVisible() != null
                ? request.getIsAlwaysVisible() : banner.getIsAlwaysVisible();

        LocalDateTime newStartAt = Boolean.TRUE.equals(newIsAlwaysVisible) ? null
                : (request.getStartAt() != null ? request.getStartAt() : banner.getStartAt());
        LocalDateTime newEndAt = Boolean.TRUE.equals(newIsAlwaysVisible) ? null
                : (request.getEndAt() != null ? request.getEndAt() : banner.getEndAt());

        String newContent = request.getContent() != null ? request.getContent() : banner.getContent();
        String newContentSanitized = (request.getContent() != null && BannerType.HTML.equals(banner.getBannerType()))
                ? htmlSanitizer.sanitizeLegal(request.getContent())
                : banner.getContentSanitized();

        banner.update(
                request.getAdminTitle()      != null ? request.getAdminTitle()      : banner.getAdminTitle(),
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

    // ═══════════════════════════════════════════
    // 이미지 업로드/삭제
    // ═══════════════════════════════════════════

    @Transactional
    public UploadedBannerImageResponse uploadImage(MultipartFile file, BannerImageType imageType, Long uploaderId) {
        // [보안] 4단계 검증 + 연월별 디렉토리 저장 (공통 흐름)
        StoredImage stored = validatedImageUploader.upload(file, "banners");

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
