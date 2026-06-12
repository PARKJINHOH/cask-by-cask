package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.spirit.entity.SpiritImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpiritImageRepository extends JpaRepository<SpiritImage, Long> {

    List<SpiritImage> findBySpiritId(Long spiritId);

    List<SpiritImage> findBySpiritIdOrderBySortOrderAscIdAsc(Long spiritId);

    Optional<SpiritImage> findBySpiritIdAndIsPrimaryTrue(Long spiritId);

    List<SpiritImage> findBySpiritIdInAndIsPrimaryTrue(List<Long> spiritIds);

    Optional<SpiritImage> findByIdAndSpiritId(Long id, Long spiritId);
}
