package com.drinkindex.domain.review.repository;

import com.drinkindex.domain.admin.dto.DailyCountProjection;
import com.drinkindex.domain.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // [점수이력 링크] 리뷰 id → 술 id 배치 조회 (행: [reviewId, spiritId])
    @Query("SELECT r.id, r.spirit.id FROM Review r WHERE r.id IN :ids")
    List<Object[]> findIdAndSpiritIdByIdIn(@Param("ids") Collection<Long> ids);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit
            WHERE r.spirit.id = :spiritId AND r.isHidden = false
            """,
            countQuery = """
            SELECT COUNT(r) FROM Review r
            WHERE r.spirit.id = :spiritId AND r.isHidden = false
            """)
    Page<Review> findBySpiritForDisplay(@Param("spiritId") Long spiritId, Pageable pageable);

    boolean existsBySpiritIdAndUserId(Long spiritId, Long userId);

    Optional<Review> findByIdAndSpiritId(Long id, Long spiritId);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit
            WHERE r.user.id = :userId
            """,
            countQuery = "SELECT COUNT(r) FROM Review r WHERE r.user.id = :userId")
    Page<Review> findByUserIdWithUser(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT AVG(r.totalScore) FROM Review r WHERE r.spirit.id = :spiritId AND r.isHidden = false")
    Optional<Double> findAvgScoreBySpiritId(@Param("spiritId") Long spiritId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.spirit.id = :spiritId AND r.isHidden = false")
    long countActiveBySpiritId(@Param("spiritId") Long spiritId);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit
            WHERE (:isHidden IS NULL OR r.isHidden = :isHidden)
            """,
            countQuery = """
            SELECT COUNT(r) FROM Review r
            WHERE (:isHidden IS NULL OR r.isHidden = :isHidden)
            """)
    Page<Review> findForAdmin(@Param("isHidden") Boolean isHidden, Pageable pageable);

    @Query(value = "SELECT DATE(created_at) as date, COUNT(*) as count FROM review WHERE created_at >= :from GROUP BY DATE(created_at) ORDER BY DATE(created_at)", nativeQuery = true)
    List<DailyCountProjection> findDailyReviewTrend(@Param("from") LocalDateTime from);
}
