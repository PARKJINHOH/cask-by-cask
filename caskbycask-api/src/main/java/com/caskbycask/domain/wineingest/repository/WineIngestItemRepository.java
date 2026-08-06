package com.caskbycask.domain.wineingest.repository;

import com.caskbycask.domain.wineingest.entity.WineIngestItem;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WineIngestItemRepository extends JpaRepository<WineIngestItem, Long> {
    Page<WineIngestItem> findByRunIdOrderByIdAsc(Long runId, Pageable pageable);
}
