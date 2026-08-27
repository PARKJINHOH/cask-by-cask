package com.caskbycask.domain.translation.repository;

import com.caskbycask.domain.translation.entity.TranslationMonthlyUsage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface TranslationMonthlyUsageRepository extends JpaRepository<TranslationMonthlyUsage, Long> {

    @Modifying
    @Query(value = """
            INSERT IGNORE INTO translation_monthly_usage
                (provider, usage_month, allocated_characters, created_at, updated_at)
            VALUES (:provider, :usageMonth, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
            """, nativeQuery = true)
    void ensureMonth(@Param("provider") String provider,
                     @Param("usageMonth") LocalDate usageMonth);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT u FROM TranslationMonthlyUsage u
            WHERE u.provider = :provider AND u.usageMonth = :usageMonth
            """)
    Optional<TranslationMonthlyUsage> findForUpdate(@Param("provider") String provider,
                                                     @Param("usageMonth") LocalDate usageMonth);

    Optional<TranslationMonthlyUsage> findByProviderAndUsageMonth(String provider, LocalDate usageMonth);
}
