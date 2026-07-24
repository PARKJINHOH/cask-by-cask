package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.admin.dto.DailyCountProjection;
import com.caskbycask.domain.review.entity.Review;
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

    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit s
            LEFT JOIN FETCH s.parent
            WHERE r.id = :reviewId
              AND r.isHidden = false
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
            """)
    Optional<Review> findPublicById(@Param("reviewId") Long reviewId);

    // [점수이력 링크] 리뷰 id → 술 id 배치 조회 (행: [reviewId, spiritId])
    @Query("SELECT r.id, r.spirit.id FROM Review r WHERE r.id IN :ids")
    List<Object[]> findIdAndSpiritIdByIdIn(@Param("ids") Collection<Long> ids);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit
            WHERE (r.spirit.id = :spiritId OR r.spirit.parent.id = :spiritId) AND r.isHidden = false
            """,
            countQuery = """
            SELECT COUNT(r) FROM Review r
            WHERE (r.spirit.id = :spiritId OR r.spirit.parent.id = :spiritId) AND r.isHidden = false
            """)
    Page<Review> findBySpiritForDisplay(@Param("spiritId") Long spiritId, Pageable pageable);

    boolean existsBySpiritIdAndUserId(Long spiritId, Long userId);

    @Query("""
            SELECT r FROM Review r
            WHERE r.user.id = :userId
              AND (r.spirit.id = :masterSpiritId OR r.spirit.parent.id = :masterSpiritId)
              AND r.isHidden = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    List<Review> findReviewsByUserAndMasterSpirit(
            @Param("userId") Long userId,
            @Param("masterSpiritId") Long masterSpiritId
    );

    @Query("""
            SELECT AVG(r.totalScore) FROM Review r
            WHERE (r.spirit.id = :spiritId OR r.spirit.parent.id = :spiritId)
              AND r.isHidden = false
            """)
    Optional<Double> findAvgScoreForMasterSpirit(@Param("spiritId") Long spiritId);

    @Query("""
            SELECT COUNT(r) FROM Review r
            WHERE (r.spirit.id = :spiritId OR r.spirit.parent.id = :spiritId)
              AND r.isHidden = false
            """)
    long countActiveForMasterSpirit(@Param("spiritId") Long spiritId);

    Optional<Review> findByIdAndSpiritId(Long id, Long spiritId);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit
            WHERE r.user.id = :userId
            """,
            countQuery = "SELECT COUNT(r) FROM Review r WHERE r.user.id = :userId")
    Page<Review> findByUserIdWithUser(@Param("userId") Long userId, Pageable pageable);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit s
            WHERE r.user.id = :userId
              AND r.isHidden = false
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
            """,
            countQuery = """
            SELECT COUNT(r) FROM Review r
            JOIN r.spirit s
            WHERE r.user.id = :userId
              AND r.isHidden = false
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
            """)
    Page<Review> findPublicByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.spirit s
            LEFT JOIN FETCH s.parent
            WHERE r.user.id = :userId
              AND r.isHidden = false
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
            """,
            countQuery = """
            SELECT COUNT(r) FROM Review r
            JOIN r.spirit s
            WHERE r.user.id = :userId
              AND r.isHidden = false
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
            """)
    Page<Review> findEmbeddableByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT AVG(r.totalScore) FROM Review r WHERE r.spirit.id = :spiritId AND r.isHidden = false")
    Optional<Double> findAvgScoreBySpiritId(@Param("spiritId") Long spiritId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.spirit.id = :spiritId AND r.isHidden = false")
    long countActiveBySpiritId(@Param("spiritId") Long spiritId);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit s
            WHERE (:isHidden IS NULL OR r.isHidden = :isHidden)
              AND (:spiritId IS NULL OR s.id = :spiritId OR s.parent.id = :spiritId)
            """,
            countQuery = """
            SELECT COUNT(r) FROM Review r
            JOIN r.spirit s
            WHERE (:isHidden IS NULL OR r.isHidden = :isHidden)
              AND (:spiritId IS NULL OR s.id = :spiritId OR s.parent.id = :spiritId)
            """)
    Page<Review> findForAdmin(
            @Param("isHidden") Boolean isHidden,
            @Param("spiritId") Long spiritId,
            Pageable pageable
    );

    long countByCreatedAtBefore(LocalDateTime dateTime);

    @Query(value = "SELECT DATE(created_at) as date, COUNT(*) as count FROM review WHERE created_at >= :from AND deleted_at IS NULL GROUP BY DATE(created_at) ORDER BY DATE(created_at)", nativeQuery = true)
    List<DailyCountProjection> findDailyReviewTrend(@Param("from") LocalDateTime from);

    @Query(value = "SELECT DATE(deleted_at) as date, COUNT(*) as count FROM review WHERE deleted_at >= :from GROUP BY DATE(deleted_at) ORDER BY DATE(deleted_at)", nativeQuery = true)
    List<DailyCountProjection> findDailyDeleteTrend(@Param("from") LocalDateTime from);
}
