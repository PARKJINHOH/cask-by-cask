package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.BottlingType;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;
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

    Optional<Spirit> findFirstByCategoryAndProducerIdAndParentIsNullAndNameEnIgnoreCase(
            SpiritCategory category, Long producerId, String nameEn);

    @Query("""
            SELECT s FROM Spirit s
            LEFT JOIN FETCH s.wineDetail w
            LEFT JOIN FETCH s.parent
            WHERE s.category = com.caskbycask.domain.spirit.entity.enums.SpiritCategory.WINE
              AND ((:producerId IS NULL AND s.producer.id IS NULL) OR s.producer.id = :producerId)
              AND LOWER(s.nameEn) = LOWER(:nameEn)
              AND (
                    (:vintageYear IS NOT NULL AND s.vintageYear = :vintageYear)
                    OR (:nonVintage = true AND s.vintageYear IS NULL
                        AND w.vintageStatus = com.caskbycask.domain.spirit.entity.enums.WineVintageStatus.NON_VINTAGE)
                  )
            ORDER BY s.id ASC
            """)
    List<Spirit> findExistingWineVintage(@Param("producerId") Long producerId,
                                          @Param("nameEn") String nameEn,
                                          @Param("vintageYear") Integer vintageYear,
                                          @Param("nonVintage") boolean nonVintage);

    Optional<Spirit> findByIdAndStatus(Long id, SpiritStatus status);

    @Query("select s.parent.id from Spirit s where s.id = :id")
    Long findParentIdById(@Param("id") Long id);

    /**
     * 생산자가 색인 대상인지 판정할 때 쓴다.
     * <p>
     * 조건은 {@code SitemapService} 의 {@code PRODUCER_HAS_ACTIVE_SPIRIT} 와 <b>같아야 한다</b> —
     * 한쪽만 바뀌면 sitemap 에서 뺀 주소를 IndexNow 로는 크롤해 달라고 조르는 상태가 된다.
     */
    boolean existsByProducerIdAndStatus(Long producerId, SpiritStatus status);

    @Query("""
            SELECT s.producer.id, COUNT(s) FROM Spirit s
            WHERE s.producer.id IN :producerIds
              AND s.parent IS NULL
            GROUP BY s.producer.id
            """)
    List<Object[]> countCatalogSpiritsByProducerIds(@Param("producerIds") List<Long> producerIds);

    @Query("SELECT s.category, COUNT(s) FROM Spirit s WHERE s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE GROUP BY s.category")
    List<Object[]> findCategoryStats();

    /**
     * 카테고리별 등록 수를 마스터 주류와 에디션(하위 병입)으로 나눠 센다.
     *
     * 카탈로그 목록은 마스터만 보여 주지만(에디션은 상세 안의 배치 목록),
     * '몇 종이 등록돼 있는가'를 말할 때는 에디션도 실제 등록된 제품이므로 함께 센다.
     */
    @Query("""
            SELECT s.category,
                   SUM(CASE WHEN s.parent IS NULL THEN 1L ELSE 0L END),
                   SUM(CASE WHEN s.parent IS NOT NULL THEN 1L ELSE 0L END)
            FROM Spirit s
            WHERE s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
            GROUP BY s.category
            """)
    List<Object[]> findCategoryCountsWithEditions();

    /** 주어진 마스터들이 거느린 에디션 수. 전문 검색으로 마스터를 찾은 경로에서 쓴다. */
    @Query("""
            SELECT COUNT(e) FROM Spirit e
            WHERE e.parent.id IN :parentIds
              AND (:status IS NULL OR e.status = :status)
            """)
    long countEditionsByParentIds(@Param("parentIds") List<Long> parentIds,
                                  @Param("status") SpiritStatus status);

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
            LEFT JOIN FETCH s.wineDetail
            WHERE s.parent.id = :parentId
            ORDER BY COALESCE(s.displayOrder, 999999) ASC, s.id ASC
            """)
    List<Spirit> findByParentId(@Param("parentId") Long parentId);

    @Query("""
            SELECT s FROM Spirit s
            LEFT JOIN FETCH s.commonDetail
            LEFT JOIN FETCH s.wineDetail
            WHERE s.parent.id = :parentId
              AND s.status IN :statuses
              AND LOWER(s.variantValue) = LOWER(:variantValue)
            ORDER BY s.id ASC
            """)
    List<Spirit> findByParentIdAndVariantValueIgnoreCaseAndStatusIn(@Param("parentId") Long parentId,
                                                                    @Param("variantValue") String variantValue,
                                                                    @Param("statuses") List<SpiritStatus> statuses);

    @Query("""
            SELECT DISTINCT s FROM Spirit s
            LEFT JOIN FETCH s.commonDetail
            LEFT JOIN FETCH s.wineDetail
            WHERE s.id IN :ids
            """)
    List<Spirit> findAllByIdWithCommonAndWineDetail(@Param("ids") java.util.Collection<Long> ids);

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
            ORDER BY s.vintageYear DESC, s.id DESC
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

    @Query("""
            SELECT s FROM Spirit s
            JOIN FETCH s.whiskyDetail w
            LEFT JOIN FETCH s.commonDetail
            WHERE s.status = com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
              AND s.category = com.caskbycask.domain.spirit.entity.enums.SpiritCategory.WHISKY
              AND s.parent IS NULL
              AND w.style IN :styles
              AND (:peated IS NULL OR w.isPeated = :peated)
              AND (:caskToken = '' OR LOWER(COALESCE(w.extraData, '')) LIKE LOWER(CONCAT('%', :caskToken, '%')))
              AND (:bottlingType IS NULL OR w.bottlingType = :bottlingType)
              AND (:caskStrength IS NULL OR w.isCaskStrength = :caskStrength)
              AND (:singleCask IS NULL OR w.isSingleCask = :singleCask)
            ORDER BY CASE WHEN s.avgScore IS NULL THEN 1 ELSE 0 END,
                     s.avgScore DESC, s.reviewCount DESC, s.id DESC
            """)
    List<Spirit> findTasteTreeRecommendations(
            @Param("styles") List<WhiskyStyle> styles,
            @Param("peated") Boolean peated,
            @Param("caskToken") String caskToken,
            @Param("bottlingType") BottlingType bottlingType,
            @Param("caskStrength") Boolean caskStrength,
            @Param("singleCask") Boolean singleCask,
            Pageable pageable);
}
