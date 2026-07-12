package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface SpiritRepository extends JpaRepository<Spirit, Long>, SpiritQueryRepository {

    Optional<Spirit> findByIdAndStatus(Long id, SpiritStatus status);

    @Query("""
            SELECT s.producer.id, COUNT(s) FROM Spirit s
            WHERE s.producer.id IN :producerIds
              AND s.parent IS NULL
            GROUP BY s.producer.id
            """)
    List<Object[]> countCatalogSpiritsByProducerIds(@Param("producerIds") List<Long> producerIds);

    @Query("SELECT s.category, COUNT(s) FROM Spirit s WHERE s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE GROUP BY s.category")
    List<Object[]> findCategoryStats();

    @Query("""
            SELECT s.country, COUNT(s) FROM Spirit s
            WHERE s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
              AND s.country IS NOT NULL AND s.country <> ''
              AND (:category IS NULL OR s.category = :category)
            GROUP BY s.country
            ORDER BY COUNT(s) DESC, s.country ASC
            """)
    List<Object[]> findCountryStats(@Param("category") SpiritCategory category);

    @Query("""
            SELECT s.region, COUNT(s) FROM Spirit s
            WHERE s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
              AND s.category = :category
              AND s.country = :country
              AND s.region IS NOT NULL AND s.region <> ''
            GROUP BY s.region
            ORDER BY COUNT(s) DESC, s.region ASC
            """)
    List<Object[]> findRegionStats(@Param("category") SpiritCategory category,
                                   @Param("country") String country);

    @Query("""
            SELECT s FROM Spirit s
            LEFT JOIN FETCH s.commonDetail
            WHERE s.parent.id = :parentId
            ORDER BY COALESCE(s.displayOrder, 999999) ASC, s.id ASC
            """)
    List<Spirit> findByParentId(@Param("parentId") Long parentId);

    @Query("""
            SELECT s FROM Spirit s
            WHERE s.parent.id = :parentId
              AND s.status IN :statuses
              AND LOWER(s.variantValue) = LOWER(:variantValue)
            ORDER BY s.id ASC
            """)
    List<Spirit> findByParentIdAndVariantValueIgnoreCaseAndStatusIn(@Param("parentId") Long parentId,
                                                                    @Param("variantValue") String variantValue,
                                                                    @Param("statuses") List<SpiritStatus> statuses);

    @Query(value = """
            SELECT s FROM Spirit s
            LEFT JOIN FETCH s.parent p
            LEFT JOIN FETCH s.registeredBy u
            WHERE s.parent IS NOT NULL
              AND (:status IS NULL OR s.status = :status)
              AND (
                    :keyword IS NULL
                    OR LOWER(s.variantValue) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(s.variantValueEn, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(s.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(s.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(p.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(p.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(u.nickname, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
            ORDER BY s.createdAt DESC, s.id DESC
            """,
            countQuery = """
            SELECT COUNT(s) FROM Spirit s
            LEFT JOIN s.parent p
            LEFT JOIN s.registeredBy u
            WHERE s.parent IS NOT NULL
              AND (:status IS NULL OR s.status = :status)
              AND (
                    :keyword IS NULL
                    OR LOWER(s.variantValue) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(s.variantValueEn, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(s.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(s.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(p.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(p.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(u.nickname, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
            """)
    Page<Spirit> findVariantRequestsForAdmin(@Param("status") SpiritStatus status,
                                             @Param("keyword") String keyword,
                                             Pageable pageable);

    @Query("""
            SELECT COUNT(s) FROM Spirit s
            WHERE s.parent IS NOT NULL
              AND s.status = :status
            """)
    long countVariantRequestsByStatus(@Param("status") SpiritStatus status);

    @Query("""
            SELECT s FROM Spirit s
            WHERE s.parent IS NOT NULL
              AND s.status = :status
            ORDER BY s.createdAt DESC, s.id DESC
            """)
    List<Spirit> findLatestVariantRequests(@Param("status") SpiritStatus status, Pageable pageable);

    /** 같은 이름(한글/영문)의 다른 배치·병입 제품 — 자기 자신 제외, ACTIVE 만 */
    @Query("""
            SELECT s FROM Spirit s
            LEFT JOIN FETCH s.commonDetail
            WHERE s.id <> :id
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
              AND (LOWER(s.nameKo) = LOWER(:nameKo)
                   OR (:nameEn <> '' AND LOWER(s.nameEn) = LOWER(:nameEn)))
            ORDER BY s.bottledYear DESC, s.vintageYear DESC, s.id DESC
            """)
    List<Spirit> findActiveVariantsByName(@Param("id") Long id,
                                          @Param("nameKo") String nameKo,
                                          @Param("nameEn") String nameEn);

    /** 상세 조회용 — 모든 서브 테이블 LEFT JOIN FETCH (N+1 방지). status가 null이면 상태 무관(관리자 전용) */
    @Query("""
            SELECT DISTINCT s FROM Spirit s
            LEFT JOIN FETCH s.producer
            LEFT JOIN FETCH s.commonDetail
            LEFT JOIN FETCH s.whiskyDetail
            LEFT JOIN FETCH s.wineDetail
            LEFT JOIN FETCH s.cognacDetail
            LEFT JOIN FETCH s.otherDetail
            WHERE s.id = :id AND (:status IS NULL OR s.status = :status)
            """)
    Optional<Spirit> findByIdWithAllDetails(@Param("id") Long id,
                                            @Param("status") SpiritStatus status);

    @Modifying
    @Query("""
            UPDATE Spirit s
            SET s.viewCount = s.viewCount + 1
            WHERE s.id = :id
              AND s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
            """)
    void incrementViewCount(@Param("id") Long id);
}
