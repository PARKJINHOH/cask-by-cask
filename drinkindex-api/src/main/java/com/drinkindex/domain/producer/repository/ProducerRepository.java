package com.drinkindex.domain.producer.repository;

import com.drinkindex.domain.producer.entity.Producer;
import com.drinkindex.domain.producer.entity.ProducerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProducerRepository extends JpaRepository<Producer, Long> {

    @Query("""
            SELECT d FROM Producer d
            WHERE (:keyword IS NULL
                   OR LOWER(d.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(d.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:nameKo IS NULL OR LOWER(d.nameKo) LIKE LOWER(CONCAT('%', :nameKo, '%')))
              AND (:nameEn IS NULL OR LOWER(d.nameEn) LIKE LOWER(CONCAT('%', :nameEn, '%')))
              AND (:country IS NULL OR LOWER(d.country) LIKE LOWER(CONCAT('%', :country, '%')))
              AND (:foundedYear IS NULL OR d.foundedYear = :foundedYear)
              AND (:type IS NULL OR d.type = :type)
            """)
    Page<Producer> search(
            @Param("keyword") String keyword,
            @Param("nameKo") String nameKo,
            @Param("nameEn") String nameEn,
            @Param("country") String country,
            @Param("foundedYear") Integer foundedYear,
            @Param("type") ProducerType type,
            Pageable pageable
    );
}
