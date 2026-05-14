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
              AND (:country IS NULL OR w.country = :country)
            """)
    Page<Winery> search(
            @Param("keyword") String keyword,
            @Param("country") String country,
            Pageable pageable
    );
}
