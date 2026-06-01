package com.drinkindex.domain.distillery.repository;

import com.drinkindex.domain.distillery.entity.Distillery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DistilleryRepository extends JpaRepository<Distillery, Long> {

    @Query("""
            SELECT d FROM Distillery d
            WHERE (:keyword IS NULL
                   OR LOWER(d.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(d.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:nameKo IS NULL OR LOWER(d.nameKo) LIKE LOWER(CONCAT('%', :nameKo, '%')))
              AND (:nameEn IS NULL OR LOWER(d.nameEn) LIKE LOWER(CONCAT('%', :nameEn, '%')))
              AND (:country IS NULL OR LOWER(d.country) LIKE LOWER(CONCAT('%', :country, '%')))
              AND (:foundedYear IS NULL OR d.foundedYear = :foundedYear)
            """)
    Page<Distillery> search(
            @Param("keyword") String keyword,
            @Param("nameKo") String nameKo,
            @Param("nameEn") String nameEn,
            @Param("country") String country,
            @Param("foundedYear") Integer foundedYear,
            Pageable pageable
    );
}
