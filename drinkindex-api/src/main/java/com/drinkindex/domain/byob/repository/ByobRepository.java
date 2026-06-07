package com.drinkindex.domain.byob.repository;

import com.drinkindex.domain.byob.entity.Byob;
import com.drinkindex.domain.byob.entity.enums.ByobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ByobRepository extends JpaRepository<Byob, Long> {

    @Query("SELECT b FROM Byob b JOIN FETCH b.host WHERE (:status IS NULL OR b.status = :status) ORDER BY b.isPinned DESC, b.createdAt DESC")
    Page<Byob> findAllByStatus(@Param("status") ByobStatus status, Pageable pageable);

    @Query("SELECT b FROM Byob b JOIN FETCH b.host ORDER BY b.isPinned DESC, b.createdAt DESC")
    Page<Byob> findAllOrderByCreatedAtDesc(Pageable pageable);

    Page<Byob> findByHostIdOrderByCreatedAtDesc(Long hostId, Pageable pageable);
}
