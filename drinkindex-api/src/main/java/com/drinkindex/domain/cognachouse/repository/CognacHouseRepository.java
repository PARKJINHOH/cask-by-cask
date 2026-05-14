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
              AND (:country IS NULL OR c.country = :country)
            """)
    Page<CognacHouse> search(
            @Param("keyword") String keyword,
            @Param("country") String country,
            Pageable pageable
    );
}
