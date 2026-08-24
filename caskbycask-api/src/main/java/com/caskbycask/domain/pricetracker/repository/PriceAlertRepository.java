package com.caskbycask.domain.pricetracker.repository;

import com.caskbycask.domain.pricetracker.entity.PriceAlert;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PriceAlertRepository extends JpaRepository<PriceAlert, Long> {

    Optional<PriceAlert> findByUserIdAndSpiritIdAndVolumeMlAndStoreType(
            Long userId, Long spiritId, Integer volumeMl, StoreType storeType);

    Optional<PriceAlert> findByUserIdAndSpiritIdAndVolumeMlIsNullAndStoreType(
            Long userId, Long spiritId, StoreType storeType);

    List<PriceAlert> findByUserId(Long userId);

    List<PriceAlert> findBySpiritIdAndVolumeMlAndStoreTypeAndIsActiveTrue(
            Long spiritId, Integer volumeMl, StoreType storeType);

    /**
     * 용량 미지정(레거시) 알림. V96 이 대부분 용량을 채우고 나머지는 비활성화하므로 사실상 비어 있지만,
     * 마이그레이션 이후에도 남을 수 있는 행을 위해 조회 경로는 유지한다.
     */
    List<PriceAlert> findBySpiritIdAndVolumeMlIsNullAndStoreTypeAndIsActiveTrue(
            Long spiritId, StoreType storeType);

    void deleteByUserId(Long userId);
}
