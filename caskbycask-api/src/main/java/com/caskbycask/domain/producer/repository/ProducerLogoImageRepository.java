package com.caskbycask.domain.producer.repository;

import com.caskbycask.domain.producer.entity.ProducerLogoImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProducerLogoImageRepository extends JpaRepository<ProducerLogoImage, Long> {

    List<ProducerLogoImage> findByProducerIdOrderBySortOrderAscIdAsc(Long producerId);

    /** 목록 화면에서 생산자마다 따로 조회하면 N+1 이 된다 — 한 번에 모아 온다. */
    @Query("""
            select image from ProducerLogoImage image
            where image.producer.id in :producerIds
            order by image.producer.id asc, image.sortOrder asc, image.id asc
            """)
    List<ProducerLogoImage> findByProducerIds(@Param("producerIds") Collection<Long> producerIds);

    /** 이미지 서빙용 — 저장 파일명으로 subPath 를 복원한다. */
    Optional<ProducerLogoImage> findBySavedFileName(String savedFileName);

    long countByProducerId(Long producerId);
}
