package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface AiNewsUsageRepository extends JpaRepository<AiNewsUsage, Long> {

    @Query("select coalesce(sum(u.inputTokens), 0) from AiNewsUsage u where u.usageAt >= :from")
    long sumInputTokensSince(@Param("from") LocalDateTime from);

    @Query("select coalesce(sum(u.outputTokens), 0) from AiNewsUsage u where u.usageAt >= :from")
    long sumOutputTokensSince(@Param("from") LocalDateTime from);

    @Query("select coalesce(sum(u.imageCount), 0) from AiNewsUsage u where u.usageAt >= :from")
    long sumImageCountSince(@Param("from") LocalDateTime from);

    @Query("select coalesce(sum(u.estimatedCostUsd), 0) from AiNewsUsage u where u.usageAt >= :from")
    BigDecimal sumEstimatedCostSince(@Param("from") LocalDateTime from);
}
