package com.caskbycask.domain.pricetracker.repository;

import com.caskbycask.domain.pricetracker.entity.PriceAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PriceAlertRepository extends JpaRepository<PriceAlert, Long> {

    Optional<PriceAlert> findByUserIdAndSpiritIdAndVolumeMl(Long userId, Long spiritId, Integer volumeMl);

    Optional<PriceAlert> findByUserIdAndSpiritIdAndVolumeMlIsNull(Long userId, Long spiritId);

    List<PriceAlert> findByUserId(Long userId);

    List<PriceAlert> findBySpiritIdAndVolumeMlAndIsActiveTrue(Long spiritId, Integer volumeMl);

    List<PriceAlert> findBySpiritIdAndVolumeMlIsNullAndIsActiveTrue(Long spiritId);
}
