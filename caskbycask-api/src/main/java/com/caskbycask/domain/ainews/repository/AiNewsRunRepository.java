package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiNewsRunRepository extends JpaRepository<AiNewsRun, Long> {
    Page<AiNewsRun> findAllByOrderByStartedAtDesc(Pageable pageable);
    Optional<AiNewsRun> findByRunKey(String runKey);

    /** 수집 차례 판정의 기준점. 마지막으로 시작된 실행 하나만 본다. */
    Optional<AiNewsRun> findFirstByOrderByStartedAtDesc();
}
