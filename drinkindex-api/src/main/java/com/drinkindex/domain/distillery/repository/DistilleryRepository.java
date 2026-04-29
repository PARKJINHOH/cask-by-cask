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
              AND (:country IS NULL OR d.country = :country)
            """)
    Page<Distillery> search(
            @Param("keyword") String keyword,
            @Param("country") String country,
            Pageable pageable
    );
}
