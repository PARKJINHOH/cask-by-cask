package com.drinkindex.domain.cognachouse.repository;

import com.drinkindex.domain.cognachouse.entity.CognacHouse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CognacHouseRepository extends JpaRepository<CognacHouse, Long> {

    @Query("""
            SELECT c FROM CognacHouse c
            WHERE (:keyword IS NULL
                   OR LOWER(c.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:nameKo IS NULL OR LOWER(c.nameKo) LIKE LOWER(CONCAT('%', :nameKo, '%')))
              AND (:nameEn IS NULL OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :nameEn, '%')))
              AND (:country IS NULL OR LOWER(c.country) LIKE LOWER(CONCAT('%', :country, '%')))
              AND (:foundedYear IS NULL OR c.foundedYear = :foundedYear)
            """)
    Page<CognacHouse> search(
            @Param("keyword") String keyword,
            @Param("nameKo") String nameKo,
            @Param("nameEn") String nameEn,
            @Param("country") String country,
            @Param("foundedYear") Integer foundedYear,
            Pageable pageable
    );
}
