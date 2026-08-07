package com.caskbycask.domain.wineingest.repository;

import com.caskbycask.domain.wineingest.entity.WineIngestItem;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.Optional;

public interface WineIngestItemRepository extends JpaRepository<WineIngestItem, Long> {
    @EntityGraph(attributePaths = {"run", "spirit", "spirit.parent"})
    Page<WineIngestItem> findByRunIdOrderByIdAsc(Long runId, Pageable pageable);

    @EntityGraph(attributePaths = {"run", "spirit", "spirit.parent"})
    Optional<WineIngestItem> findWithSpiritById(Long id);
}
