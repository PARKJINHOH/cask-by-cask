package com.caskbycask.domain.venue.repository;

import com.caskbycask.domain.venue.entity.VenueCity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VenueCityRepository extends JpaRepository<VenueCity, Long> {

    List<VenueCity> findByCountryCodeAndIsActiveTrueOrderBySortOrderAscIdAsc(String countryCode);

    List<VenueCity> findByIsActiveTrueOrderByCountryCodeAscSortOrderAscIdAsc();

    /**
     * 비활성 도시도 찾는다 — 도시를 내려도 이미 색인된 URL 로 크롤러와 북마크가 계속 들어온다.
     * 노출 여부 판단은 서비스가 한다.
     */
    Optional<VenueCity> findByCountryCodeAndSlug(String countryCode, String slug);

    boolean existsByCountryCodeAndSlug(String countryCode, String slug);
}
