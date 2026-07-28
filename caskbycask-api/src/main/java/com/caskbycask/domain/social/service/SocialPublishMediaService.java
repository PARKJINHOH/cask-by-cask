package com.caskbycask.domain.social.service;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostImage;
import com.caskbycask.domain.community.repository.PostImageRepository;
import com.caskbycask.domain.community.repository.PostRepository;
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
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SocialPublishMediaService {

    private final SocialPublishBundleMediaRepository mediaRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final PostRepository postRepository;
    private final PostImageRepository postImageRepository;
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

    public List<SocialPublishBundleMedia> snapshotPost(SocialPublishBundle bundle, Long postId) {
        mediaRepository.deleteByBundleId(bundle.getId());
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalStateException("소식 게시글을 찾을 수 없습니다."));

        int order = 0;
        String content = post.getContentSanitized() != null
                ? post.getContentSanitized() : post.getContent();
        Map<String, PostImage> uploadedImages = new HashMap<>();
        for (PostImage image : postImageRepository.findByPostId(postId)) {
            uploadedImages.put(image.getImageUrl(), image);
        }
        for (String imageUrl : Jsoup.parse(content == null ? "" : content)
                .select("img[src]").eachAttr("src")) {
            String sourceImageUrl = resolveEditorImageUrl(imageUrl, uploadedImages);
            if (sourceImageUrl == null) continue;
            mediaRepository.save(SocialPublishBundleMedia.builder()
                    .bundle(bundle)
                    .sortOrder(order++)
                    .mediaRole(SocialMediaRole.EDITOR_IMAGE)
                    .sourceImageUrl(sourceImageUrl)
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

    private static String resolveEditorImageUrl(
            String imageUrl, Map<String, PostImage> uploadedImages) {
        if (imageUrl == null || imageUrl.isBlank()) return null;
        PostImage uploaded = uploadedImages.get(imageUrl);
        if (uploaded == null && imageUrl.startsWith("https://")) {
            try {
                uploaded = uploadedImages.get(URI.create(imageUrl).getPath());
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }
        if (uploaded != null) {
            return "/uploads/" + uploaded.getSubPath() + "/" + uploaded.getSavedFileName();
        }
        if (imageUrl.startsWith("/uploads/")
                || imageUrl.startsWith("/api/social/images/")
                || imageUrl.startsWith("https://")) {
            return imageUrl;
        }
        return null;
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
