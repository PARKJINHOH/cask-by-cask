package com.caskbycask.domain.byob.repository;

import com.caskbycask.domain.byob.entity.Byob;
import com.caskbycask.domain.byob.entity.enums.ByobStatus;
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

    // 미디어 고아 정리 — BYOB 본문에 해당 파일명이 박혀 있는지 (사용 중 여부 교차검증).
    //   BYOB 는 syncImageUsage 를 거치지 않아 본문 이미지가 is_used=false 로 남으므로 반드시 교차검증 필요.
    @Query("SELECT COUNT(b) > 0 FROM Byob b WHERE b.content LIKE CONCAT('%', :fragment, '%')")
    boolean existsByContentContaining(@Param("fragment") String fragment);
}
