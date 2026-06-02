package com.drinkindex.domain.pricetracker.repository;

import com.drinkindex.domain.pricetracker.entity.PriceReport;
import com.drinkindex.domain.pricetracker.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PriceReportRepository extends JpaRepository<PriceReport, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PriceReport p SET p.store = :targetStore WHERE p.store = :suggestedStore")
    void updateStoreReference(
            @Param("suggestedStore") Store suggestedStore,
            @Param("targetStore") Store targetStore);
}
