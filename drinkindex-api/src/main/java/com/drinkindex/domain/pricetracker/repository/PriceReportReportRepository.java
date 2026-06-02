package com.drinkindex.domain.pricetracker.repository;

import com.drinkindex.domain.pricetracker.entity.PriceReportReport;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PriceReportReportRepository extends JpaRepository<PriceReportReport, Long> {

    boolean existsByPriceReportIdAndReporterId(Long priceReportId, Long reporterId);

    long countByPriceReportIdAndStatus(Long priceReportId, PriceReportReportStatus status);

    @Query("""
            SELECT r FROM PriceReportReport r
            WHERE (:status IS NULL OR r.status = :status)
            ORDER BY r.createdAt DESC
            """)
    Page<PriceReportReport> findAllForAdmin(
            @Param("status") PriceReportReportStatus status,
            Pageable pageable);
}
