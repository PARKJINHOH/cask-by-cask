package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsSourceConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AiNewsSourceConfigRepository extends JpaRepository<AiNewsSourceConfig, Long> {
    List<AiNewsSourceConfig> findAllByOrderBySourceNameAsc();
    List<AiNewsSourceConfig> findByEnabledTrueOrderBySourceNameAsc();
    Optional<AiNewsSourceConfig> findByDomain(String domain);
    boolean existsByDomain(String domain);
}
