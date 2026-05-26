package com.drinkindex.domain.bottlecollection.repository;

import com.drinkindex.domain.bottlecollection.entity.UserBottleImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserBottleImageRepository extends JpaRepository<UserBottleImage, Long> {
    Optional<UserBottleImage> findByIdAndUserBottleId(Long id, Long bottleId);
    int countByUserBottleId(Long bottleId);
}
