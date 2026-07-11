package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiNewsRunRepository extends JpaRepository<AiNewsRun, Long> {
    Page<AiNewsRun> findAllByOrderByStartedAtDesc(Pageable pageable);
    Optional<AiNewsRun> findByRunKey(String runKey);
}
