package com.caskbycask.domain.pricetracker.repository;

import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PriceDiscountItemRepository extends JpaRepository<PriceDiscountItem, Long> {

    List<PriceDiscountItem> findByPriceReportId(Long priceReportId);

    // 관리자 목록 N+1 방지 — 페이지 내 여러 제보의 할인항목을 한 번에 조회 후 메모리 그룹핑.
    List<PriceDiscountItem> findByPriceReportIdIn(List<Long> priceReportIds);
}
