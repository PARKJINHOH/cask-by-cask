package com.drinkindex.domain.winery.repository;

import com.drinkindex.domain.winery.entity.Winery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WineryRepository extends JpaRepository<Winery, Long> {

    @Query("""
            SELECT w FROM Winery w
            WHERE (:keyword IS NULL
                   OR LOWER(w.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(w.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:nameKo IS NULL OR LOWER(w.nameKo) LIKE LOWER(CONCAT('%', :nameKo, '%')))
              AND (:nameEn IS NULL OR LOWER(w.nameEn) LIKE LOWER(CONCAT('%', :nameEn, '%')))
              AND (:country IS NULL OR LOWER(w.country) LIKE LOWER(CONCAT('%', :country, '%')))
              AND (:foundedYear IS NULL OR w.foundedYear = :foundedYear)
            """)
    Page<Winery> search(
            @Param("keyword") String keyword,
            @Param("nameKo") String nameKo,
            @Param("nameEn") String nameEn,
            @Param("country") String country,
            @Param("foundedYear") Integer foundedYear,
            Pageable pageable
    );
}
