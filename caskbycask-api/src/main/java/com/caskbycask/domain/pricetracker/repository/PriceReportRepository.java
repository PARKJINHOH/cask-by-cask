package com.caskbycask.domain.pricetracker.repository;

import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PriceReportRepository extends JpaRepository<PriceReport, Long> {

    // [점수이력 링크] 가격제보 id → 술 id 배치 조회 (행: [reportId, spiritId])
    @Query("SELECT pr.id, pr.spirit.id FROM PriceReport pr WHERE pr.id IN :ids")
    List<Object[]> findIdAndSpiritIdByIdIn(@Param("ids") Collection<Long> ids);

    // [패치 12] 모더레이션 대시보드 — 대기 가격 등록 수 / 플래그된 대기 가격 수
    long countByStatus(PriceReportStatus status);
    long countByStatusAndAutoFlaggedTrue(PriceReportStatus status);
    Optional<PriceReport> findTopByStatusOrderByCreatedAtDescIdDesc(PriceReportStatus status);

    @Modifying
    @Query("UPDATE PriceReport p SET p.reportCount = p.reportCount + 1 WHERE p.id = :id")
    void incrementReportCount(@Param("id") Long id);

    // ±30% 자동 플래그 판별용 — 동일 spirit+store의 최근 APPROVED 실구매가
    @Query("""
            SELECT p.actualPrice FROM PriceReport p
            WHERE p.spirit.id = :spiritId
            AND p.store.id = :storeId
            AND p.volumeMl = :volumeMl
            AND p.status = :status
            AND p.currency = :currency
            AND p.actualPrice IS NOT NULL
            ORDER BY p.createdAt DESC
            """)
    List<BigDecimal> findRecentApprovedActualPrices(
            @Param("spiritId") Long spiritId,
            @Param("storeId") Long storeId,
            @Param("volumeMl") Integer volumeMl,
            @Param("status") PriceReportStatus status,
            @Param("currency") PriceCurrency currency,
            Pageable pageable);

    // 관리자 목록 — autoFlagged 우선 정렬
    @EntityGraph(attributePaths = {"spirit", "store", "reporter"})
    @Query("""
            SELECT p FROM PriceReport p
            WHERE (:status IS NULL OR p.status = :status)
            AND (:isFlagged IS NULL OR p.autoFlagged = :isFlagged)
            ORDER BY p.autoFlagged DESC, p.createdAt ASC
            """)
    Page<PriceReport> findAllForAdmin(
            @Param("status") PriceReportStatus status,
            @Param("isFlagged") Boolean isFlagged,
            Pageable pageable);

    // 차트용 — spirit+기간, N+1 방지 JOIN FETCH
    @Query("""
            SELECT p FROM PriceReport p
            JOIN FETCH p.spirit
            LEFT JOIN FETCH p.store
            WHERE p.spirit.id IN :spiritIds
            AND p.status = :status
            ORDER BY p.purchasedAt ASC
            """)
    List<PriceReport> findApprovedForChart(
            @Param("spiritIds") Collection<Long> spiritIds,
            @Param("status") PriceReportStatus status);

    // 차트 점 클릭 상세 — 해당 주(week) 범위
    @Query("""
            SELECT p FROM PriceReport p
            JOIN FETCH p.spirit
            LEFT JOIN FETCH p.store
            WHERE p.spirit.id IN :spiritIds
            AND p.status = :status
            ORDER BY p.actualPrice ASC
            """)
    List<PriceReport> findApprovedForChartDetail(
            @Param("spiritIds") Collection<Long> spiritIds,
            @Param("status") PriceReportStatus status);

    /** SEO 본문용 최근 승인 실구매가 1건 조회. 호출 측에서 Pageable(0, 1)을 전달한다. */
    @EntityGraph(attributePaths = {"store"})
    @Query("""
            SELECT p FROM PriceReport p
            WHERE p.spirit.id IN :spiritIds
            AND p.status = :status
            AND p.actualPrice IS NOT NULL
            ORDER BY p.createdAt DESC, p.id DESC
            """)
    List<PriceReport> findRecentApprovedForSeo(
            @Param("spiritIds") Collection<Long> spiritIds,
            @Param("status") PriceReportStatus status,
            Pageable pageable);

    // 본인 등록 목록
    @Query("""
            SELECT p FROM PriceReport p
            WHERE p.reporter.id = :reporterId
            AND (:status IS NULL OR p.status = :status)
            ORDER BY p.createdAt DESC
            """)
    Page<PriceReport> findByReporter(
            @Param("reporterId") Long reporterId,
            @Param("status") PriceReportStatus status,
            Pageable pageable);
}
