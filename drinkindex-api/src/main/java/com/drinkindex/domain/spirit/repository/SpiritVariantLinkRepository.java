package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.spirit.entity.SpiritVariantLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SpiritVariantLinkRepository extends JpaRepository<SpiritVariantLink, Long> {

    /** 기준 술(id)이 한쪽에 포함된 모든 오버라이드 쌍 */
    @Query("SELECT l FROM SpiritVariantLink l WHERE l.spiritId = :id OR l.relatedSpiritId = :id")
    List<SpiritVariantLink> findAllInvolving(@Param("id") Long id);

    /** 정규화된 쌍(min, max)으로 단건 조회 */
    Optional<SpiritVariantLink> findBySpiritIdAndRelatedSpiritId(Long spiritId, Long relatedSpiritId);
}
