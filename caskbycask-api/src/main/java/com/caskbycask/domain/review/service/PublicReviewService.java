package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.PublicReviewResponse;
import com.caskbycask.domain.review.dto.RecentReviewResponse;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicReviewService {

    /** 최근 리뷰 기본 조회 개수 */
    private static final int DEFAULT_RECENT_SIZE = 10;
    /** 최근 리뷰 최대 조회 개수 */
    private static final int MAX_RECENT_SIZE = 20;

    private final ReviewRepository reviewRepository;
    private final SpiritImageRepository imageRepository;
    private final ReviewImageService reviewImageService;

    @Transactional(readOnly = true)
    public PublicReviewResponse get(Long reviewId) {
        var review = reviewRepository.findPublicById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        String imageUrl = firstImage(review.getSpirit().getId());
        if (imageUrl == null && review.getSpirit().getParent() != null) {
            imageUrl = firstImage(review.getSpirit().getParent().getId());
        }
        return PublicReviewResponse.from(
                review,
                imageUrl,
                reviewImageService.findByReviewId(reviewId).stream()
                        .map(com.caskbycask.domain.review.dto.ReviewImageResponse::from)
                        .toList()
        );
    }

    /** 메인 홈 사이드바 "등록된 리뷰" 총 건수. */
    @Transactional(readOnly = true)
    public long countAll() {
        return reviewRepository.countPublicReviews();
    }

    /**
     * 메인 "최근 등록된 리뷰" 조회.
     * 마스터 주류 단위로 최신 리뷰 1건만 노출하며, 대표 이미지는 IN 배치 조회 후
     * 에디션에 이미지가 없으면 마스터 이미지로 대체한다.
     */
    @Transactional(readOnly = true)
    public List<RecentReviewResponse> getRecent(Integer size) {
        List<Review> reviews = reviewRepository.findRecentDistinctBySpirit(
                PageRequest.of(0, normalizeRecentSize(size)));
        if (reviews.isEmpty()) {
            return List.of();
        }

        Map<Long, String> primaryImages = fetchPrimaryImages(reviews);

        return reviews.stream()
                .map(review -> RecentReviewResponse.from(review, resolveImageUrl(review, primaryImages)))
                .toList();
    }

    private int normalizeRecentSize(Integer size) {
        if (size == null || size < 1) {
            return DEFAULT_RECENT_SIZE;
        }
        return Math.min(size, MAX_RECENT_SIZE);
    }

    /** 리뷰 대상 주류 + 그 마스터 주류의 대표 이미지를 한 번에 조회 */
    private Map<Long, String> fetchPrimaryImages(List<Review> reviews) {
        Set<Long> spiritIds = new LinkedHashSet<>();
        for (Review review : reviews) {
            Spirit spirit = review.getSpirit();
            spiritIds.add(spirit.getId());
            if (spirit.getParent() != null) {
                spiritIds.add(spirit.getParent().getId());
            }
        }
        return imageRepository.findBySpiritIdInAndIsPrimaryTrue(new ArrayList<>(spiritIds)).stream()
                .collect(Collectors.toMap(
                        image -> image.getSpirit().getId(),
                        SpiritImage::getImageUrl,
                        (first, second) -> first));
    }

    private String resolveImageUrl(Review review, Map<Long, String> primaryImages) {
        Spirit spirit = review.getSpirit();
        String imageUrl = primaryImages.get(spirit.getId());
        if (imageUrl == null && spirit.getParent() != null) {
            imageUrl = primaryImages.get(spirit.getParent().getId());
        }
        return imageUrl;
    }

    private String firstImage(Long spiritId) {
        return imageRepository.findBySpiritIdAndIsPrimaryTrue(spiritId)
                .map(SpiritImage::getImageUrl)
                .orElseGet(() -> imageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spiritId)
                        .stream().findFirst().map(SpiritImage::getImageUrl).orElse(null));
    }
}
