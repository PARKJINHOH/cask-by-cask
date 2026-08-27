package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsSourceConfig;
import com.caskbycask.domain.ainews.entity.enums.AiNewsSourceCrawlStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AiNewsSourceConfigRepository extends JpaRepository<AiNewsSourceConfig, Long> {

    /**
     * 관리자 출처 목록. keyword 는 출처 이름·도메인을 함께 훑는다(소문자 + '!' 이스케이프해서 넘길 것).
     * crawlStatus 는 마지막 수집 결과로 걸러 실패한 출처만 모아 보기 위한 것이고,
     * autoDiscovered 는 자동 등록 시절에 쌓인 옛 행만 골라 정리할 때 쓴다.
     */
    @Query("""
            select s from AiNewsSourceConfig s
            where (:crawlStatus is null or s.crawlStatus = :crawlStatus)
              and (:enabled is null or s.enabled = :enabled)
              and (:autoDiscovered is null or s.autoDiscovered = :autoDiscovered)
              and (:keyword is null
                   or lower(s.sourceName) like concat('%', :keyword, '%') escape '!'
                   or lower(s.domain) like concat('%', :keyword, '%') escape '!')
            order by s.sourceName asc
            """)
    Page<AiNewsSourceConfig> search(@Param("crawlStatus") AiNewsSourceCrawlStatus crawlStatus,
                                    @Param("enabled") Boolean enabled,
                                    @Param("autoDiscovered") Boolean autoDiscovered,
                                    @Param("keyword") String keyword,
                                    Pageable pageable);

    List<AiNewsSourceConfig> findByEnabledTrueOrderBySourceNameAsc();
    List<AiNewsSourceConfig> findByDomain(String domain);
    boolean existsByDomainAndPathPrefix(String domain, String pathPrefix);
    boolean existsByDomainAndPathPrefixAndIdNot(String domain, String pathPrefix, Long id);
}
