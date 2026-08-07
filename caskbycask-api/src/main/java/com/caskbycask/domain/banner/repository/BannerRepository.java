package com.caskbycask.domain.banner.repository;

import com.caskbycask.domain.banner.entity.Banner;
import com.caskbycask.domain.banner.entity.enums.BannerLanguage;
import com.caskbycask.domain.banner.entity.enums.BannerPosition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BannerRepository extends JpaRepository<Banner, Long> {

    /** 신규 배너를 목록 맨 아래에 붙일 때 쓰는 기준값. */
    Optional<Banner> findTopByOrderBySortOrderDesc();

    @Query("""
            SELECT b FROM Banner b
            WHERE b.isVisible = true
            AND b.position = :position
            AND b.language = :language
            AND (b.isAlwaysVisible = true OR (b.startAt <= :now AND (b.endAt IS NULL OR b.endAt >= :now)))
            ORDER BY b.sortOrder ASC, b.createdAt DESC
            """)
    List<Banner> findActiveBanners(
            @Param("position") BannerPosition position,
            @Param("language") BannerLanguage language,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    @Query("""
            SELECT b FROM Banner b
            WHERE (:language IS NULL OR b.language = :language)
            AND (:position IS NULL OR b.position = :position)
            AND (:isVisible IS NULL OR b.isVisible = :isVisible)
            ORDER BY b.sortOrder ASC, b.createdAt DESC
            """)
    Page<Banner> findAllForAdmin(
            @Param("language") BannerLanguage language,
            @Param("position") BannerPosition position,
            @Param("isVisible") Boolean isVisible,
            Pageable pageable
    );
}
