package com.drinkindex.domain.pricetracker.repository;

import com.drinkindex.domain.pricetracker.entity.PriceReportImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PriceReportImageRepository extends JpaRepository<PriceReportImage, Long> {

    List<PriceReportImage> findByPriceReportIdOrderBySortOrder(Long priceReportId);
}
