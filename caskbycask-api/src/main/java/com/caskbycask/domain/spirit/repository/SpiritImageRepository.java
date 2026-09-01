package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.spirit.entity.SpiritImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpiritImageRepository extends JpaRepository<SpiritImage, Long> {

    List<SpiritImage> findBySpiritId(Long spiritId);

    List<SpiritImage> findBySpiritIdOrderBySortOrderAscIdAsc(Long spiritId);

    /** 에디션 그룹 통합 갤러리용 — 여러 주류의 이미지를 한 번에 읽는다. */
    List<SpiritImage> findBySpiritIdInOrderBySortOrderAscIdAsc(List<Long> spiritIds);

    Optional<SpiritImage> findBySpiritIdAndIsPrimaryTrue(Long spiritId);

    List<SpiritImage> findBySpiritIdInAndIsPrimaryTrue(List<Long> spiritIds);

    Optional<SpiritImage> findByIdAndSpiritId(Long id, Long spiritId);

    boolean existsBySpiritId(Long spiritId);
}
