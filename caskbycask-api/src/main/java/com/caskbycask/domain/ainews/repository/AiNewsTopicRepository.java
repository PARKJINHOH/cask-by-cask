package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsTopic;
import com.caskbycask.domain.ainews.entity.enums.AiNewsTopicStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AiNewsTopicRepository extends JpaRepository<AiNewsTopic, Long> {
    Page<AiNewsTopic> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AiNewsTopic> findByStatusOrderByCreatedAtDesc(AiNewsTopicStatus status, Pageable pageable);
    List<AiNewsTopic> findByStatusOrderByCreatedAtAsc(AiNewsTopicStatus status);
    Optional<AiNewsTopic> findByNormalizedKey(String normalizedKey);
    boolean existsByNormalizedKey(String normalizedKey);
}
