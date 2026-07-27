package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.PublicReviewResponse;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PublicReviewService {

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

    private String firstImage(Long spiritId) {
        return imageRepository.findBySpiritIdAndIsPrimaryTrue(spiritId)
                .map(SpiritImage::getImageUrl)
                .orElseGet(() -> imageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spiritId)
                        .stream().findFirst().map(SpiritImage::getImageUrl).orElse(null));
    }
}
