package com.caskbycask.domain.social.service;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.entity.SpiritVariantReviewRequest;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.social.dto.SocialPublicationResponse;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.SocialThumbnailTemplate;
import com.caskbycask.domain.social.entity.enums.*;
import com.caskbycask.domain.social.repository.SocialPublishBundleRepository;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import com.caskbycask.domain.social.repository.SocialThumbnailTemplateRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SocialPublishRequestService {

    private static final char[] CODE_ALPHABET =
            "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".toCharArray();

    private final SocialPublishBundleRepository bundleRepository;
    private final SocialPublicationRepository publicationRepository;
    private final SocialThumbnailTemplateRepository templateRepository;
    private final SocialPublishingProperties properties;
    private final SocialPublishMediaService publishMediaService;
    private final ReviewRepository reviewRepository;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public void requestReview(Review review, User requester, SocialPublishSelection selection) {
        if (!requested(selection)) return;
        SocialPublishBundle bundle = createBundle(
                SocialSourceType.REVIEW, review.getId(), SocialSourceType.REVIEW, review.getId(),
                requester, selection, SocialMediaMode.REVIEW_IMAGE, SocialPublicationStatus.QUEUED);
        publishMediaService.snapshotReview(bundle, review);
    }

    @Transactional
    public void requestMissingReviewPlatforms(Review review, User requester,
                                              SocialPublishSelection selection) {
        if (!requested(selection)) return;

        Set<SocialPlatform> existingPlatforms = EnumSet.noneOf(SocialPlatform.class);
        for (SocialPublishBundle bundle :
                bundleRepository.findByContentTypeAndContentId(SocialSourceType.REVIEW, review.getId())) {
            publicationRepository.findByBundleIdOrderByPlatformAsc(bundle.getId()).stream()
                    .map(SocialPublication::getPlatform)
                    .forEach(existingPlatforms::add);
        }

        boolean instagram = selection.instagramRequested()
                && !existingPlatforms.contains(SocialPlatform.INSTAGRAM);
        boolean threads = selection.threadsRequested()
                && !existingPlatforms.contains(SocialPlatform.THREADS);
        if (!instagram && !threads) return;

        SocialPublishSelection missingSelection = new SocialPublishSelection(
                instagram,
                threads,
                selection.consentAccepted(),
                selection.consentVersion(),
                selection.locale(),
                SocialMediaMode.REVIEW_IMAGE,
                null,
                null,
                null
        );
        SocialPublishBundle bundle = createBundle(
                SocialSourceType.REVIEW, review.getId(), SocialSourceType.REVIEW, review.getId(),
                requester, missingSelection, SocialMediaMode.REVIEW_IMAGE, SocialPublicationStatus.QUEUED);
        publishMediaService.snapshotReview(bundle, review);
    }

    @Transactional
    public void requestVariantReview(SpiritVariantReviewRequest request, User requester,
                                     SocialPublishSelection selection) {
        if (!requested(selection)) return;
        createBundle(SocialSourceType.VARIANT_REVIEW_REQUEST, request.getId(), null, null,
                requester, selection, SocialMediaMode.REVIEW_IMAGE, SocialPublicationStatus.WAITING_SOURCE);
    }

    @Transactional
    public void requestPost(Long postId, User requester, SocialPublishSelection selection) {
        if (!requested(selection)) return;
        SocialMediaMode mode = resolveNewsMode(selection);
        createBundle(SocialSourceType.POST, postId, SocialSourceType.POST, postId,
                requester, selection, mode, SocialPublicationStatus.QUEUED);
    }

    @Transactional
    public void requestAiArticle(Long articleId, User requester, SocialPublishSelection selection) {
        if (!requested(selection)) return;
        if (!bundleRepository.findByOriginTypeAndOriginId(SocialSourceType.AI_NEWS_ARTICLE, articleId).isEmpty()) {
            return;
        }
        SocialMediaMode mode = resolveNewsMode(selection);
        createBundle(SocialSourceType.AI_NEWS_ARTICLE, articleId, null, null,
                requester, selection, mode, SocialPublicationStatus.WAITING_SOURCE);
    }

    @Transactional
    public void bindVariantReview(Long requestId, Long reviewId) {
        bindAndQueue(SocialSourceType.VARIANT_REVIEW_REQUEST, requestId, SocialSourceType.REVIEW, reviewId);
    }

    /**
     * 승인 대기 중인 하위 에디션 요청은 실제 Review가 생성될 때 미디어를 스냅샷한다.
     * 따라서 승인 전 이미지 편집은 별도 파일 복사 없이 자동으로 최종 구성에 반영된다.
     */
    @Transactional
    public void refreshWaitingVariantReviewMedia(SpiritVariantReviewRequest request) {
        // Intentionally deferred until bindVariantReview.
    }

    @Transactional
    public void bindAiArticle(Long articleId, Long postId) {
        bindAndQueue(SocialSourceType.AI_NEWS_ARTICLE, articleId, SocialSourceType.POST, postId);
    }

    @Transactional
    public void cancelOrigin(SocialSourceType originType, Long originId) {
        for (SocialPublishBundle bundle : bundleRepository.findByOriginTypeAndOriginId(originType, originId)) {
            publicationRepository.findByBundleIdOrderByPlatformAsc(bundle.getId()).stream()
                    .filter(value -> value.getStatus() == SocialPublicationStatus.WAITING_SOURCE)
                    .forEach(SocialPublication::cancel);
        }
    }

    @Transactional
    public void markSourceDeleted(SocialSourceType contentType, Long contentId) {
        bundleRepository.findByContentTypeAndContentId(contentType, contentId)
                .forEach(SocialPublishBundle::markSourceDeleted);
    }

    @Transactional
    public SocialPublicationResponse retry(Long publicationId, Long userId, boolean admin) {
        SocialPublication publication = publicationRepository.findWithBundleById(publicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_PUBLICATION_NOT_FOUND));
        Long requestedById = publication.getBundle().getRequestedBy() != null
                ? publication.getBundle().getRequestedBy().getId() : null;
        if (!admin && !java.util.Objects.equals(requestedById, userId)) {
            throw new CustomException(ErrorCode.SOCIAL_PUBLICATION_ACCESS_DENIED);
        }
        if (!publication.canRetry()) {
            throw new CustomException(ErrorCode.SOCIAL_PUBLICATION_NOT_RETRYABLE);
        }
        publication.getBundle().clearRenderedImage();
        publication.manualRetry();
        return SocialPublicationResponse.from(publication);
    }

    /**
     * 이미 발행된 게시물을 관리자가 외부 플랫폼에서 삭제한 뒤 다시 등록할 때 사용한다.
     * 기존 게시 이력과 요청 사용자는 그대로 보존하고, 사용자 이력에 노출되지 않는 별도 번들을 만든다.
     */
    @Transactional
    public SocialPublicationResponse republish(Long publicationId) {
        SocialPublication original = publicationRepository.findWithBundleById(publicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_PUBLICATION_NOT_FOUND));
        if (original.getStatus() != SocialPublicationStatus.PUBLISHED
                && original.getStatus() != SocialPublicationStatus.EXTERNALLY_DELETED) {
            throw new CustomException(ErrorCode.SOCIAL_PUBLICATION_NOT_REPUBLISHABLE);
        }

        SocialPublishBundle source = original.getBundle();
        if (source.isSourceDeleted() || source.getContentType() == null || source.getContentId() == null) {
            throw new CustomException(ErrorCode.SOCIAL_PUBLICATION_NOT_REPUBLISHABLE);
        }

        SocialPublishBundle republishBundle = bundleRepository.save(SocialPublishBundle.builder()
                .originType(source.getOriginType())
                .originId(source.getOriginId())
                .contentType(source.getContentType())
                .contentId(source.getContentId())
                .requestedBy(null)
                .locale(source.getLocale())
                .consentVersion(source.getConsentVersion())
                .consentedAt(source.getConsentedAt())
                .mediaMode(source.getMediaMode())
                .thumbnailTemplate(source.getThumbnailTemplate())
                .thumbnailText(source.getThumbnailText())
                .directImageUrl(source.getDirectImageUrl())
                .shortCode(uniqueShortCode())
                .build());
        publishMediaService.copy(source, republishBundle);

        SocialPublication republish = publicationRepository.save(SocialPublication.builder()
                .bundle(republishBundle)
                .platform(original.getPlatform())
                .status(SocialPublicationStatus.QUEUED)
                .nextAttemptAt(LocalDateTime.now())
                .build());
        return SocialPublicationResponse.from(republish);
    }

    @Transactional(readOnly = true)
    public Page<SocialPublicationResponse> myHistory(Long userId, int page, int size) {
        return publicationRepository.findByBundleRequestedByIdOrderByCreatedAtDesc(
                        userId, PageRequest.of(page, Math.min(size, 50)))
                .map(SocialPublicationResponse::from);
    }

    @Transactional(readOnly = true)
    public List<SocialPublicationResponse> states(SocialSourceType type, Long contentId, Long userId, boolean admin) {
        List<SocialPublishBundle> bundles = bundleRepository.findByContentTypeAndContentId(type, contentId);
        if (bundles.isEmpty()) {
            bundles = bundleRepository.findByOriginTypeAndOriginId(type, contentId);
        }
        return bundles.stream()
                .filter(bundle -> admin || (bundle.getRequestedBy() != null
                        && bundle.getRequestedBy().getId().equals(userId)))
                .flatMap(bundle -> publicationRepository.findByBundleIdOrderByPlatformAsc(bundle.getId()).stream())
                .map(SocialPublicationResponse::from)
                .toList();
    }

    private void bindAndQueue(SocialSourceType originType, Long originId,
                              SocialSourceType contentType, Long contentId) {
        for (SocialPublishBundle bundle : bundleRepository.findByOriginTypeAndOriginId(originType, originId)) {
            bundle.bindContent(contentType, contentId);
            if (contentType == SocialSourceType.REVIEW) {
                Review review = reviewRepository.findById(contentId)
                        .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
                publishMediaService.snapshotReview(bundle, review);
            }
            publicationRepository.findByBundleIdOrderByPlatformAsc(bundle.getId()).stream()
                    .filter(value -> value.getStatus() == SocialPublicationStatus.WAITING_SOURCE)
                    .forEach(SocialPublication::queue);
        }
    }

    private SocialPublishBundle createBundle(SocialSourceType originType, Long originId,
                                             SocialSourceType contentType, Long contentId,
                                             User requester, SocialPublishSelection selection,
                                             SocialMediaMode mediaMode,
                                             SocialPublicationStatus initialStatus) {
        SocialThumbnailTemplate template = null;
        if (mediaMode == SocialMediaMode.TEMPLATE) {
            if (selection.templateId() == null) throw new CustomException(ErrorCode.SOCIAL_TEMPLATE_REQUIRED);
            template = templateRepository.findById(selection.templateId())
                    .filter(SocialThumbnailTemplate::isActive)
                    .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_TEMPLATE_NOT_FOUND));
        }
        if (mediaMode == SocialMediaMode.DIRECT_UPLOAD && !StringUtils.hasText(selection.directImageUrl())) {
            throw new CustomException(ErrorCode.SOCIAL_IMAGE_REQUIRED);
        }
        SocialPublishBundle bundle = bundleRepository.save(SocialPublishBundle.builder()
                .originType(originType)
                .originId(originId)
                .contentType(contentType)
                .contentId(contentId)
                .requestedBy(requester)
                .locale(selection.normalizedLocale())
                .consentVersion(selection.normalizedConsentVersion())
                .consentedAt(LocalDateTime.now())
                .mediaMode(mediaMode)
                .thumbnailTemplate(template)
                .thumbnailText(trimToNull(selection.thumbnailText()))
                .directImageUrl(trimToNull(selection.directImageUrl()))
                .shortCode(uniqueShortCode())
                .build());
        if (selection.instagramRequested()) createPublication(bundle, SocialPlatform.INSTAGRAM, initialStatus);
        if (selection.threadsRequested()) createPublication(bundle, SocialPlatform.THREADS, initialStatus);
        return bundle;
    }

    private void createPublication(SocialPublishBundle bundle, SocialPlatform platform,
                                   SocialPublicationStatus status) {
        publicationRepository.save(SocialPublication.builder()
                .bundle(bundle)
                .platform(platform)
                .status(status)
                .nextAttemptAt(status == SocialPublicationStatus.QUEUED ? LocalDateTime.now() : null)
                .build());
    }

    private SocialMediaMode resolveNewsMode(SocialPublishSelection selection) {
        if (selection.mediaMode() == SocialMediaMode.TEMPLATE) return SocialMediaMode.TEMPLATE;
        if (selection.mediaMode() == SocialMediaMode.DIRECT_UPLOAD) return SocialMediaMode.DIRECT_UPLOAD;
        throw new CustomException(ErrorCode.SOCIAL_MEDIA_MODE_REQUIRED);
    }

    private boolean requested(SocialPublishSelection selection) {
        return properties.isEnabled() && selection != null && selection.anyRequested();
    }

    private String uniqueShortCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder code = new StringBuilder(10);
            for (int index = 0; index < 10; index++) {
                code.append(CODE_ALPHABET[random.nextInt(CODE_ALPHABET.length)]);
            }
            if (bundleRepository.findByShortCode(code.toString()).isEmpty()) return code.toString();
        }
        throw new IllegalStateException("Could not allocate social short URL.");
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
