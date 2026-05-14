package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SpiritRepository extends JpaRepository<Spirit, Long>, SpiritQueryRepository {

    Optional<Spirit> findByIdAndStatus(Long id, SpiritStatus status);

    /** 상세 조회용 — 모든 서브 테이블 LEFT JOIN FETCH (N+1 방지) */
    @Query("""
            SELECT DISTINCT s FROM Spirit s
            LEFT JOIN FETCH s.distillery
            LEFT JOIN FETCH s.commonDetail
            LEFT JOIN FETCH s.whiskyDetail
            LEFT JOIN FETCH s.wineDetail
            LEFT JOIN FETCH s.cognacDetail
            WHERE s.id = :id AND s.status = :status
            """)
    Optional<Spirit> findByIdWithAllDetails(@Param("id") Long id,
                                            @Param("status") SpiritStatus status);
}
