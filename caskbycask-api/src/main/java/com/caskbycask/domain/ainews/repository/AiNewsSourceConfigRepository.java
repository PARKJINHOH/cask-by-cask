package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsSourceConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AiNewsSourceConfigRepository extends JpaRepository<AiNewsSourceConfig, Long> {
    Page<AiNewsSourceConfig> findAllByOrderBySourceNameAsc(Pageable pageable);
    List<AiNewsSourceConfig> findByEnabledTrueOrderBySourceNameAsc();
    List<AiNewsSourceConfig> findByDomain(String domain);
    boolean existsByDomainAndPathPrefix(String domain, String pathPrefix);
    boolean existsByDomainAndPathPrefixAndIdNot(String domain, String pathPrefix, Long id);
}
