package com.caskbycask.domain.pricetracker.repository;

import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PriceDiscountItemRepository extends JpaRepository<PriceDiscountItem, Long> {

    List<PriceDiscountItem> findByPriceReportId(Long priceReportId);
}
