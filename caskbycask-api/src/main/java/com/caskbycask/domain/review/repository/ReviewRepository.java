package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.admin.dto.DailyCountProjection;
import com.caskbycask.domain.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

public interface ReviewRepository extends JpaRepository<Review, Long>, ReviewQueryRepository {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Review r WHERE r.id = :reviewId")
    Optional<Review> findByIdForSocialPublish(@Param("reviewId") Long reviewId);

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

    /**
     * 공개된 리뷰 총 건수 — 메인 홈 사이드바 통계.
     * 숨김 처리된 리뷰와 비공개(ACTIVE 가 아닌) 주류의 리뷰는 사용자에게 보이지 않으므로 세지 않는다.
     * 삭제 리뷰는 Review 의 @SQLRestriction 이 자동 제외한다.
     */
    @Query("""
            SELECT COUNT(r) FROM Review r
            JOIN r.spirit s
            WHERE r.isHidden = false
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
            """)
    long countPublicReviews();

    /**
     * 메인 "최근 등록된 리뷰" 용 조회.
     * 마스터 주류 단위(에디션은 부모로 묶음)로 가장 최근 리뷰 1건만 남기고 최신순으로 정렬한다.
     * createdAt 은 JPA Auditing 으로만 채워지고 수정되지 않으므로 MAX(id) 를 최신 기준으로 사용한다.
     * 삭제 리뷰는 Review 의 @SQLRestriction(deleted_at IS NULL) 이 서브쿼리까지 적용해 자동 제외된다.
     */
    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit s
            LEFT JOIN FETCH s.parent p
            WHERE r.isHidden = false
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
              AND r.id = (
                  SELECT MAX(r2.id) FROM Review r2
                  JOIN r2.spirit s2
                  LEFT JOIN s2.parent p2
                  WHERE COALESCE(p2.id, s2.id) = COALESCE(p.id, s.id)
                    AND r2.isHidden = false
                    AND s2.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
              )
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    List<Review> findRecentDistinctBySpirit(Pageable pageable);

    // [점수이력 링크] 리뷰 id → 술 id 배치 조회 (행: [reviewId, spiritId])
    @Query("SELECT r.id, r.spirit.id FROM Review r WHERE r.id IN :ids")
    List<Object[]> findIdAndSpiritIdByIdIn(@Param("ids") Collection<Long> ids);

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.spirit
            LEFT JOIN FETCH r.venue v
            LEFT JOIN FETCH v.city
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

    /** 위 개수 중 실제로 평균에 들어간 리뷰만 — 점수를 안 남긴 리뷰는 totalScore 가 null 이다. */
    @Query("""
            SELECT COUNT(r) FROM Review r
            WHERE (r.spirit.id = :spiritId OR r.spirit.parent.id = :spiritId)
              AND r.isHidden = false
              AND r.totalScore IS NOT NULL
            """)
    long countScoredForMasterSpirit(@Param("spiritId") Long spiritId);

    Optional<Review> findByIdAndSpiritId(Long id, Long spiritId);

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

    @Query("""
            SELECT COUNT(r) FROM Review r
            WHERE r.spirit.id = :spiritId AND r.isHidden = false AND r.totalScore IS NOT NULL
            """)
    long countScoredBySpiritId(@Param("spiritId") Long spiritId);

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
