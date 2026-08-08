package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsSourceConfig;
import com.caskbycask.domain.ainews.entity.enums.AiNewsSourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AiNewsSourceConfigRepository extends JpaRepository<AiNewsSourceConfig, Long> {

    /**
     * 관리자 출처 목록. keyword 는 출처 이름·도메인을 함께 훑는다(소문자 + '!' 이스케이프해서 넘길 것).
     * blocked 는 항상 확정된 값을 받는다 — 기본 목록은 false(차단 숨김)를 넘긴다.
     */
    @Query("""
            select s from AiNewsSourceConfig s
            where s.blocked = :blocked
              and (:sourceType is null or s.sourceType = :sourceType)
              and (:enabled is null or s.enabled = :enabled)
              and (:keyword is null
                   or lower(s.sourceName) like concat('%', :keyword, '%') escape '!'
                   or lower(s.domain) like concat('%', :keyword, '%') escape '!')
            order by s.sourceName asc
            """)
    Page<AiNewsSourceConfig> search(@Param("sourceType") AiNewsSourceType sourceType,
                                    @Param("enabled") Boolean enabled,
                                    @Param("blocked") boolean blocked,
                                    @Param("keyword") String keyword,
                                    Pageable pageable);

    List<AiNewsSourceConfig> findByEnabledTrueOrderBySourceNameAsc();
    List<AiNewsSourceConfig> findByBlockedTrueOrderBySourceNameAsc();
    List<AiNewsSourceConfig> findByDomain(String domain);
    boolean existsByDomainAndPathPrefix(String domain, String pathPrefix);
    boolean existsByDomainAndPathPrefixAndIdNot(String domain, String pathPrefix, Long id);
}
