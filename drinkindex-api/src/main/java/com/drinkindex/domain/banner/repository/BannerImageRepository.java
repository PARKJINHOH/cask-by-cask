package com.drinkindex.domain.banner.repository;

import com.drinkindex.domain.banner.entity.BannerImage;
import com.drinkindex.domain.banner.entity.enums.BannerImageType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BannerImageRepository extends JpaRepository<BannerImage, Long> {

    List<BannerImage> findByBannerId(Long bannerId);

    Optional<BannerImage> findByBannerIdAndImageTypeAndIsUsedTrue(Long bannerId, BannerImageType imageType);

    Optional<BannerImage> findByImageUrl(String imageUrl);

    Optional<BannerImage> findBySavedFileName(String savedFileName);
}
