package com.drinkindex.domain.pricetracker.repository;

import com.drinkindex.domain.pricetracker.entity.PriceReportReport;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PriceReportReportRepository extends JpaRepository<PriceReportReport, Long> {

    List<PriceReportReport> findByPriceReportIdAndStatus(Long priceReportId, PriceReportReportStatus status);

    long countByPriceReportIdAndStatus(Long priceReportId, PriceReportReportStatus status);
}
