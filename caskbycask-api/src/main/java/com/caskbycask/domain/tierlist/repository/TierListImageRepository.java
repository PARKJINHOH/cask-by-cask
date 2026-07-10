package com.caskbycask.domain.tierlist.repository;

import com.caskbycask.domain.tierlist.entity.TierListImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TierListImageRepository extends JpaRepository<TierListImage, Long> {

    Optional<TierListImage> findBySavedFileName(String savedFileName);
}
