package com.caskbycask.domain.social.service;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewImageRepository;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.SocialPublishBundleMedia;
import com.caskbycask.domain.social.entity.enums.SocialMediaRole;
import com.caskbycask.domain.social.repository.SocialPublishBundleMediaRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SocialPublishMediaService {

    private final SocialPublishBundleMediaRepository mediaRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final SocialImageRenderService imageRenderService;

    public List<SocialPublishBundleMedia> find(Long bundleId) {
        return mediaRepository.findByBundleIdOrderBySortOrderAscIdAsc(bundleId);
    }

    public void markRendered(SocialPublishBundleMedia media, String renderedImageUrl) {
        media.rendered(renderedImageUrl);
        mediaRepository.save(media);
    }

    public List<SocialPublishBundleMedia> snapshotReview(SocialPublishBundle bundle, Review review) {
        mediaRepository.deleteByBundleId(bundle.getId());
        String representative = representativeImageUrl(review.getSpirit());
        if (representative == null) {
            throw new IllegalStateException("리뷰에 게시 가능한 대표 이미지가 없습니다.");
        }

        int order = 0;
        mediaRepository.save(SocialPublishBundleMedia.builder()
                .bundle(bundle)
                .sortOrder(order++)
                .mediaRole(SocialMediaRole.REPRESENTATIVE)
                .sourceImageUrl(representative)
                .build());
        for (var image : reviewImageRepository.findByReviewIdOrderBySortOrderAscIdAsc(review.getId())) {
            // 요청 시점의 사본을 SNS 규격으로 고정하여 이후 리뷰 이미지 변경과 분리한다.
            String renderedImageUrl = imageRenderService.renderReviewUpload(
                    image.getSubPath(), image.getSavedFileName());
            registerRollbackDelete(renderedImageUrl);
            mediaRepository.save(SocialPublishBundleMedia.builder()
                    .bundle(bundle)
                    .sortOrder(order++)
                    .mediaRole(SocialMediaRole.REVIEW_UPLOAD)
                    .sourceImageUrl(image.getImageUrl())
                    .renderedImageUrl(renderedImageUrl)
                    .build());
        }
        return find(bundle.getId());
    }

    public void copy(SocialPublishBundle source, SocialPublishBundle target) {
        for (SocialPublishBundleMedia media : find(source.getId())) {
            mediaRepository.save(SocialPublishBundleMedia.builder()
                    .bundle(target)
                    .sortOrder(media.getSortOrder())
                    .mediaRole(media.getMediaRole())
                    .sourceImageUrl(media.getSourceImageUrl())
                    .renderedImageUrl(media.getRenderedImageUrl())
                    .build());
        }
    }

    private String representativeImageUrl(Spirit spirit) {
        String direct = firstImageUrl(spirit.getId());
        if (direct != null) return direct;
        return spirit.getParent() != null ? firstImageUrl(spirit.getParent().getId()) : null;
    }

    private String firstImageUrl(Long spiritId) {
        return spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(spiritId)
                .map(SpiritImage::getImageUrl)
                .orElseGet(() -> {
                    List<SpiritImage> images =
                            spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spiritId);
                    return images.isEmpty() ? null : images.getFirst().getImageUrl();
                });
    }

    private void registerRollbackDelete(String imageUrl) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) {
                            imageRenderService.deleteGeneratedImage(imageUrl);
                        }
                    }
                });
    }
}
