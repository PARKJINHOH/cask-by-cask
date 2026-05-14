package com.drinkindex.domain.cognacappellation.repository;

import com.drinkindex.domain.cognacappellation.entity.CognacAppellation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CognacAppellationRepository extends JpaRepository<CognacAppellation, Long> {

    @Query("""
            SELECT a FROM CognacAppellation a
            WHERE (:keyword IS NULL
                   OR LOWER(a.nameKo) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(a.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<CognacAppellation> search(@Param("keyword") String keyword, Pageable pageable);
}
