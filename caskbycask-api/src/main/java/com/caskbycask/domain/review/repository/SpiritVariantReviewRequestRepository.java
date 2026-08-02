package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.SpiritVariantReviewRequest;
import com.caskbycask.domain.review.entity.enums.VariantReviewRequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SpiritVariantReviewRequestRepository extends JpaRepository<SpiritVariantReviewRequest, Long> {

    @Query(value = """
            SELECT r FROM SpiritVariantReviewRequest r
            JOIN FETCH r.masterSpirit m
            JOIN FETCH r.requestUser u
            LEFT JOIN FETCH r.linkedVariant lv
            LEFT JOIN FETCH r.review rv
            WHERE (:status IS NULL OR r.status = :status)
              AND (
                :keyword IS NULL
                OR LOWER(m.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.variantValue) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(r.variantValueEn, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """,
            countQuery = """
            SELECT COUNT(r) FROM SpiritVariantReviewRequest r
            JOIN r.masterSpirit m
            JOIN r.requestUser u
            WHERE (:status IS NULL OR r.status = :status)
              AND (
                :keyword IS NULL
                OR LOWER(m.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.variantValue) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(r.variantValueEn, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<SpiritVariantReviewRequest> findForAdmin(
            @Param("status") VariantReviewRequestStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query(value = """
            SELECT r FROM SpiritVariantReviewRequest r
            JOIN FETCH r.masterSpirit m
            LEFT JOIN FETCH r.linkedVariant lv
            WHERE r.requestUser.id = :userId
              AND (:status IS NULL OR r.status = :status)
              AND (:category IS NULL OR m.category = :category)
            """,
            countQuery = """
            SELECT COUNT(r) FROM SpiritVariantReviewRequest r
            JOIN r.masterSpirit m
            WHERE r.requestUser.id = :userId
              AND (:status IS NULL OR r.status = :status)
              AND (:category IS NULL OR m.category = :category)
            """)
    Page<SpiritVariantReviewRequest> findByRequester(
            @Param("userId") Long userId,
            @Param("status") VariantReviewRequestStatus status,
            @Param("category") SpiritCategory category,
            Pageable pageable
    );

    /** 마이페이지 하위 에디션 요청 탭의 카테고리 필터용 집계 — 행: [카테고리, 건수] */
    @Query("""
            SELECT m.category, COUNT(r) FROM SpiritVariantReviewRequest r
            JOIN r.masterSpirit m
            WHERE r.requestUser.id = :userId
              AND (:status IS NULL OR r.status = :status)
            GROUP BY m.category
            """)
    List<Object[]> countByRequesterGroupByCategory(
            @Param("userId") Long userId,
            @Param("status") VariantReviewRequestStatus status
    );

    long countByStatus(VariantReviewRequestStatus status);

    Optional<SpiritVariantReviewRequest> findTopByStatusOrderByCreatedAtDescIdDesc(
            VariantReviewRequestStatus status);
}
