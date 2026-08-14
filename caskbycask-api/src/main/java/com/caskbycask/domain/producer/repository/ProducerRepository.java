package com.caskbycask.domain.producer.repository;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.entity.ProducerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProducerRepository extends JpaRepository<Producer, Long> {

    Optional<Producer> findFirstByTypeAndNameEnIgnoreCase(ProducerType type, String nameEn);

    List<Producer> findAllByWebsiteIsNotNull();

    @Query("""
            SELECT d FROM Producer d
            WHERE (:keyword IS NULL
                   OR LOWER(d.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(d.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(d.searchKeywords) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:nameKo IS NULL OR LOWER(d.nameKo) LIKE LOWER(CONCAT('%', :nameKo, '%')))
              AND (:nameEn IS NULL OR LOWER(d.nameEn) LIKE LOWER(CONCAT('%', :nameEn, '%')))
              AND (:country IS NULL OR LOWER(d.country) LIKE LOWER(CONCAT('%', :country, '%')))
              AND (:foundedYear IS NULL OR d.foundedYear = :foundedYear)
              AND (:type IS NULL OR d.type = :type)
              AND (:hasLogo IS NULL OR EXISTS (
                    SELECT 1 FROM ProducerLogoImage logo WHERE logo.producer = d
                  ))
            """)
    Page<Producer> search(
            @Param("keyword") String keyword,
            @Param("nameKo") String nameKo,
            @Param("nameEn") String nameEn,
            @Param("country") String country,
            @Param("foundedYear") Integer foundedYear,
            @Param("type") ProducerType type,
            /**
             * null 이면 전체, null 이 아니면 로고가 등록된 생산자만.
             * 값 자체는 보지 않는다 — 호출부(ProducerService)에서 걸지 말지를 정해 null 로 넘긴다.
             */
            @Param("hasLogo") Boolean hasLogo,
            Pageable pageable
    );
}
