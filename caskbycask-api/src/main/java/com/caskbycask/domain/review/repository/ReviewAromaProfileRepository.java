package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.ReviewAromaProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ReviewAromaProfileRepository extends JpaRepository<ReviewAromaProfile, Long> {

    @Query("""
            select distinct p from ReviewAromaProfile p
            left join fetch p.items
            where p.review.id in :reviewIds
            order by p.review.id, p.phase
            """)
    List<ReviewAromaProfile> findByReviewIds(@Param("reviewIds") Collection<Long> reviewIds);

    @Query("""
            select distinct p from ReviewAromaProfile p
            left join fetch p.items
            where p.variantReviewRequest.id in :requestIds
            order by p.variantReviewRequest.id, p.phase
            """)
    List<ReviewAromaProfile> findByVariantRequestIds(@Param("requestIds") Collection<Long> requestIds);

    @Modifying(flushAutomatically = true)
    @Query("delete from ReviewAromaProfile p where p.review.id = :reviewId")
    void deleteByReviewId(@Param("reviewId") Long reviewId);

    @Modifying(flushAutomatically = true)
    @Query("delete from ReviewAromaProfile p where p.variantReviewRequest.id = :requestId")
    void deleteByVariantRequestId(@Param("requestId") Long requestId);
}
