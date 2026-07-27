package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.ReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {

    List<ReviewImage> findByReviewIdOrderBySortOrderAscIdAsc(Long reviewId);

    List<ReviewImage> findByVariantReviewRequestIdOrderBySortOrderAscIdAsc(Long requestId);

    @Query("""
            select image from ReviewImage image
            where image.review.id in :reviewIds
            order by image.review.id asc, image.sortOrder asc, image.id asc
            """)
    List<ReviewImage> findByReviewIds(@Param("reviewIds") Collection<Long> reviewIds);

    @Query("""
            select image from ReviewImage image
            where image.variantReviewRequest.id in :requestIds
            order by image.variantReviewRequest.id asc, image.sortOrder asc, image.id asc
            """)
    List<ReviewImage> findByVariantReviewRequestIds(
            @Param("requestIds") Collection<Long> requestIds);

    Optional<ReviewImage> findBySavedFileName(String savedFileName);

    long countByReviewId(Long reviewId);

    long countByVariantReviewRequestId(Long requestId);
}
