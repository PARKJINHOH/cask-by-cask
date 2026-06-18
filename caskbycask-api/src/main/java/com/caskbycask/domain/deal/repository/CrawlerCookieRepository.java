package com.caskbycask.domain.deal.repository;

import com.caskbycask.domain.deal.entity.CrawlerCookie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CrawlerCookieRepository extends JpaRepository<CrawlerCookie, Long> {
}
