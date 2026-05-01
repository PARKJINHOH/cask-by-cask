package com.drinkindex.domain.review.repository;

import com.drinkindex.domain.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @Query(value = """
            SELECT r FROM Review r
            JOIN FETCH r.user
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
}
