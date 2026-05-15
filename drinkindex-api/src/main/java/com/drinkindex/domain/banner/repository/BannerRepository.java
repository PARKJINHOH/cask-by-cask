package com.drinkindex.domain.banner.repository;

import com.drinkindex.domain.banner.entity.Banner;
import com.drinkindex.domain.banner.entity.enums.BannerLanguage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long> {

    @Query("""
            SELECT b FROM Banner b
            WHERE b.isVisible = true
            AND b.language = :language
            AND (b.isAlwaysVisible = true OR (b.startAt <= :now AND b.endAt >= :now))
            ORDER BY b.sortOrder ASC
            """)
    List<Banner> findActiveBanners(
            @Param("language") BannerLanguage language,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    @Query("""
            SELECT b FROM Banner b
            WHERE (:language IS NULL OR b.language = :language)
            AND (:isVisible IS NULL OR b.isVisible = :isVisible)
            ORDER BY b.sortOrder ASC, b.createdAt DESC
            """)
    Page<Banner> findAllForAdmin(
            @Param("language") BannerLanguage language,
            @Param("isVisible") Boolean isVisible,
            Pageable pageable
    );
}
